<?php

namespace App\Modules\Radiology\Services;

use App\Core\Database;
use PDO;

class RisPacsService
{
    /** Standard DICOM Window/Level Presets */
    public const WL_PRESETS = [
        'lung' => ['name' => 'Lung Window', 'width' => 1500, 'center' => -600, 'modality' => 'CT'],
        'bone' => ['name' => 'Bone Window', 'width' => 2000, 'center' => 300, 'modality' => 'CT'],
        'soft_tissue' => ['name' => 'Soft Tissue', 'width' => 350, 'center' => 40, 'modality' => 'CT'],
        'brain' => ['name' => 'Brain', 'width' => 80, 'center' => 40, 'modality' => 'CT'],
        'mediastinum' => ['name' => 'Mediastinum', 'width' => 400, 'center' => 50, 'modality' => 'CT'],
        'chest_xray' => ['name' => 'Chest Radiograph', 'width' => 4096, 'center' => 2048, 'modality' => 'DX'],
        'abdomen_xray' => ['name' => 'Abdomen Radiograph', 'width' => 3500, 'center' => 1800, 'modality' => 'DX']
    ];

    /**
     * Generate standard DICOM Study Instance UID: 1.2.826.0.1.3680043.9.{hospital_id}.{year}{timestamp}{random}
     */
    public static function generateStudyInstanceUid(): string
    {
        $prefix = "1.2.826.0.1.3680043.9.7214"; // ISO root registered sub-tree
        $timePart = date('YmdHis');
        $randPart = mt_rand(100000, 999999);
        return "{$prefix}.{$timePart}.{$randPart}";
    }

    public static function generateSeriesInstanceUid(string $studyUid, int $seriesNumber = 1): string
    {
        return "{$studyUid}.{$seriesNumber}." . mt_rand(1000, 9999);
    }

    /**
     * Fetch or register PACS Study record linked to a given procedure order or accession number
     */
    public function getOrCreateStudy(int $orderId): array
    {
        $db = Database::connection();

        // 1. Check if study exists in ris_pacs_studies
        $st = $db->prepare("SELECT * FROM ris_pacs_studies WHERE order_id = :oid LIMIT 1");
        $st->execute(['oid' => $orderId]);
        $study = $st->fetch(PDO::FETCH_ASSOC);

        if (!$study) {
            // Find patient and order details
            $ordSt = $db->prepare(
                "SELECT ppo.id AS order_id, ppo.patient_id, ppo.accession_no,
                        cfg.name AS study_name, cfg.identifying_code, cfg.rad_modality,
                        p.patient_no, p.first_name, p.last_name, p.sex, p.birthdate,
                        rio.id AS ris_order_id, rio.accession_no AS ris_accession_no
                 FROM patient_procedure_orders ppo
                 JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
                 JOIN patients p ON p.id = ppo.patient_id
                 LEFT JOIN ris_imaging_orders rio ON rio.order_id = ppo.id
                 WHERE ppo.id = :oid
                 LIMIT 1"
            );
            $ordSt->execute(['oid' => $orderId]);
            $ord = $ordSt->fetch(PDO::FETCH_ASSOC);
            if (!$ord) {
                return ['success' => false, 'message' => 'Imaging order not found.'];
            }

            $accessionNo = $ord['accession_no'] ?: ($ord['ris_accession_no'] ?: RisImagingOrderService::nextAccessionNo($db));
            $modality = strtoupper($ord['rad_modality'] ?: 'DX');
            if ($modality === 'XRAY') $modality = 'DX';
            if ($modality === 'ULTRASOUND') $modality = 'US';

            $studyUid = self::generateStudyInstanceUid();
            $studyDate = date('Y-m-d');
            $studyTime = date('H:i:s');
            $age = $ord['birthdate'] ? ((string) date_diff(date_create($ord['birthdate']), date_create(date('Y-m-d')))->y . 'Y') : 'Unknown';
            $sex = strtoupper(substr((string) ($ord['sex'] ?: 'M'), 0, 1));

            // Default W/L depending on modality
            $dwc = 40;
            $dww = 350;
            if ($modality === 'DX' || $modality === 'CR') {
                $dwc = 2048;
                $dww = 4096;
            } elseif ($modality === 'CT') {
                $dwc = 40;
                $dww = 350;
            }

            // Web viewer URL endpoint
            $webViewerUrl = "/radiology/pacs/viewer?study_uid={$studyUid}";

            $ins = $db->prepare(
                "INSERT INTO ris_pacs_studies (
                    study_instance_uid, accession_no, patient_id, order_id, ris_order_id,
                    modality, study_description, study_date, study_time, patient_age,
                    patient_sex, series_count, instance_count, pacs_aet, pacs_status,
                    default_window_center, default_window_width, web_viewer_url, created_at
                ) VALUES (
                    :uid, :acc, :pid, :oid, :ris_id,
                    :mod, :desc, :sdate, :stime, :age,
                    :sex, 1, 1, 'HOSPITAL_PACS', 'online',
                    :dwc, :dww, :vurl, NOW()
                )"
            );

            $ins->execute([
                'uid' => $studyUid,
                'acc' => $accessionNo,
                'pid' => $ord['patient_id'],
                'oid' => $orderId,
                'ris_id' => $ord['ris_order_id'],
                'mod' => $modality,
                'desc' => $ord['study_name'],
                'sdate' => $studyDate,
                'stime' => $studyTime,
                'age' => $age,
                'sex' => in_array($sex, ['M', 'F'], true) ? $sex : 'M',
                'dwc' => $dwc,
                'dww' => $dww,
                'vurl' => $webViewerUrl
            ]);

            $studyId = (int) $db->lastInsertId();

            // Create initial series
            $seriesUid = self::generateSeriesInstanceUid($studyUid, 1);
            $db->prepare(
                "INSERT INTO ris_pacs_series (
                    pacs_study_id, series_instance_uid, series_number, series_description,
                    modality, window_center, window_width, created_at
                ) VALUES (
                    :sid, :suid, 1, :sdesc, :mod, :wc, :ww, NOW()
                )"
            )->execute([
                'sid' => $studyId,
                'suid' => $seriesUid,
                'sdesc' => $ord['study_name'] . ' Primary Series',
                'mod' => $modality,
                'wc' => $dwc,
                'ww' => $dww
            ]);

            // Sync UIDs to patient_procedure_orders and ris_imaging_orders
            $db->prepare("UPDATE patient_procedure_orders SET accession_no = :acc WHERE id = :oid")->execute(['acc' => $accessionNo, 'oid' => $orderId]);
            $db->prepare("UPDATE ris_imaging_orders SET study_instance_uid = :uid WHERE order_id = :oid")->execute(['uid' => $studyUid, 'oid' => $orderId]);
            $db->prepare("UPDATE rad_images SET study_instance_uid = :uid, accession_no = :acc WHERE order_id = :oid AND study_instance_uid IS NULL")->execute(['uid' => $studyUid, 'acc' => $accessionNo, 'oid' => $orderId]);

            $study = $this->getStudyById($studyId);
        } else {
            // Count actual images
            $imgSt = $db->prepare("SELECT COUNT(*) FROM rad_images WHERE order_id = :oid AND deleted_at IS NULL");
            $imgSt->execute(['oid' => $orderId]);
            $imgCount = max(1, (int) $imgSt->fetchColumn());

            if ($imgCount !== (int) $study['instance_count']) {
                $db->prepare("UPDATE ris_pacs_studies SET instance_count = :cnt, updated_at = NOW() WHERE id = :id")->execute(['cnt' => $imgCount, 'id' => $study['id']]);
                $study['instance_count'] = $imgCount;
            }
        }

        return ['success' => true, 'data' => $study];
    }

    public function getStudyByUid(string $studyUid): ?array
    {
        $db = Database::connection();
        $st = $db->prepare(
            "SELECT s.*, p.patient_no, p.first_name, p.last_name, p.birthdate,
                    cfg.name AS study_name, cfg.identifying_code
             FROM ris_pacs_studies s
             JOIN patients p ON p.id = s.patient_id
             JOIN patient_procedure_orders ppo ON ppo.id = s.order_id
             JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
             WHERE s.study_instance_uid = :uid
             LIMIT 1"
        );
        $st->execute(['uid' => $studyUid]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;

        $row['patient_name'] = trim($row['first_name'] . ' ' . $row['last_name']);
        $row['series'] = $this->getSeriesForStudy((int) $row['id']);
        $row['images'] = $this->getImagesForOrder((int) $row['order_id']);
        $row['presets'] = self::WL_PRESETS;
        return $row;
    }

    public function getStudyById(int $id): ?array
    {
        $db = Database::connection();
        $st = $db->prepare(
            "SELECT s.*, p.patient_no, p.first_name, p.last_name, p.birthdate,
                    cfg.name AS study_name, cfg.identifying_code
             FROM ris_pacs_studies s
             JOIN patients p ON p.id = s.patient_id
             JOIN patient_procedure_orders ppo ON ppo.id = s.order_id
             JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
             WHERE s.id = :id
             LIMIT 1"
        );
        $st->execute(['id' => $id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;

        $row['patient_name'] = trim($row['first_name'] . ' ' . $row['last_name']);
        $row['series'] = $this->getSeriesForStudy($id);
        $row['images'] = $this->getImagesForOrder((int) $row['order_id']);
        $row['presets'] = self::WL_PRESETS;
        return $row;
    }

    private function getSeriesForStudy(int $pacsStudyId): array
    {
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM ris_pacs_series WHERE pacs_study_id = :sid ORDER BY series_number");
        $st->execute(['sid' => $pacsStudyId]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getImagesForOrder(int $orderId): array
    {
        $db = Database::connection();
        $st = $db->prepare(
            "SELECT id, order_id, instance_no, series_desc, is_key, original_filename,
                    stored_filename, file_path, mime_type, file_size, notes, created_at
             FROM rad_images
             WHERE order_id = :oid AND deleted_at IS NULL
             ORDER BY is_key DESC, instance_no ASC, id ASC"
        );
        $st->execute(['oid' => $orderId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$img) {
            $ext = strtolower(pathinfo($img['stored_filename'], PATHINFO_EXTENSION));
            $img['is_dicom'] = in_array($ext, ['dcm', 'ima'], true);
        }
        return $rows;
    }

    /**
     * Search PACS studies archive
     */
    public function searchStudies(array $filters): array
    {
        $db = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['patient_id'])) {
            $where[] = 's.patient_id = :pid';
            $params['pid'] = (int) $filters['patient_id'];
        }

        if (!empty($filters['modality'])) {
            $where[] = 's.modality = :mod';
            $params['mod'] = strtoupper($filters['modality']);
        }

        if (!empty($filters['study_date'])) {
            $where[] = 's.study_date = :sdate';
            $params['sdate'] = $filters['study_date'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = '(s.study_instance_uid LIKE :q1 OR s.accession_no LIKE :q2 OR p.patient_no LIKE :q3 OR CONCAT(p.first_name, " ", p.last_name) LIKE :q4 OR s.study_description LIKE :q5)';
            $params['q1'] = $q;
            $params['q2'] = $q;
            $params['q3'] = $q;
            $params['q4'] = $q;
            $params['q5'] = $q;
        }

        $sql = "SELECT s.*, p.patient_no, p.first_name, p.last_name, p.birthdate,
                       cfg.name AS study_name
                FROM ris_pacs_studies s
                JOIN patients p ON p.id = s.patient_id
                JOIN patient_procedure_orders ppo ON ppo.id = s.order_id
                JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY s.study_date DESC, s.id DESC
                LIMIT 50";

        $st = $db->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['patient_name'] = trim($r['first_name'] . ' ' . $r['last_name']);
        }
        return $rows;
    }
}
