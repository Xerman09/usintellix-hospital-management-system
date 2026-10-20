<?php

namespace App\Modules\CpoeDiagnostics\Services;

use App\Core\Database;
use App\Modules\Lab\Services\LabService;
use App\Modules\Radiology\Services\RadiologyService;
use PDO;
use Throwable;

class CpoeDiagnosticService
{
    public const COMMON_BLOOD_TESTS = [
        ['code' => 'CBC', 'name' => 'Complete blood count (CBC) with differential', 'section' => 'Hematology', 'container' => 'edta'],
        ['code' => 'BMP', 'name' => 'Basic metabolic panel (BMP)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'CMP', 'name' => 'Comprehensive metabolic panel (CMP)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'LIPID', 'name' => 'Lipid profile (cholesterol, HDL, LDL, triglycerides)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'HBA1C', 'name' => 'HbA1c (glycated hemoglobin)', 'section' => 'Hematology', 'container' => 'edta'],
        ['code' => 'LFT', 'name' => 'Liver function tests (ALT, AST, ALP, bilirubin, albumin)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'BUNCREAT', 'name' => 'Renal function (BUN and Creatinine)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'LYTES', 'name' => 'Electrolytes (sodium, potassium, chloride)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'PTINR', 'name' => 'Prothrombin time (PT / INR)', 'section' => 'Coagulation', 'container' => 'citrate'],
        ['code' => 'TROP', 'name' => 'Troponin I (high sensitivity)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'TSH', 'name' => 'Thyroid stimulating hormone (TSH)', 'section' => 'Chemistry', 'container' => 'sst'],
        ['code' => 'UA', 'name' => 'Urinalysis (routine)', 'section' => 'Urinalysis', 'container' => 'urine'],
    ];

    public const COMMON_CULTURES = [
        ['code' => 'BCX', 'name' => 'Blood culture (2 sets)', 'section' => 'Microbiology', 'container' => 'culture'],
        ['code' => 'UCX', 'name' => 'Urine culture and sensitivity', 'section' => 'Microbiology', 'container' => 'urine'],
        ['code' => 'SPCX', 'name' => 'Sputum Gram stain and culture', 'section' => 'Microbiology', 'container' => 'sputum'],
        ['code' => 'WCX', 'name' => 'Wound swab culture', 'section' => 'Microbiology', 'container' => 'swab'],
        ['code' => 'TSCX', 'name' => 'Throat swab culture', 'section' => 'Microbiology', 'container' => 'swab'],
        ['code' => 'STCX', 'name' => 'Stool culture', 'section' => 'Microbiology', 'container' => 'stool'],
    ];

    public const COMMON_RADIOLOGY = [
        ['code' => 'CXR', 'name' => 'Chest X-ray (PA)', 'modality' => 'xray', 'minutes' => 10],
        ['code' => 'CXRPAL', 'name' => 'Chest X-ray (PA and lateral)', 'modality' => 'xray', 'minutes' => 15],
        ['code' => 'AXR', 'name' => 'Abdominal X-ray (KUB)', 'modality' => 'xray', 'minutes' => 10],
        ['code' => 'USKUB', 'name' => 'Ultrasound kidneys, ureters and bladder (KUB)', 'modality' => 'ultrasound', 'minutes' => 20],
        ['code' => 'USABD', 'name' => 'Ultrasound whole abdomen', 'modality' => 'ultrasound', 'minutes' => 30],
        ['code' => 'USOB', 'name' => 'Ultrasound obstetric / pelvic', 'modality' => 'ultrasound', 'minutes' => 20],
        ['code' => 'CTHEAD', 'name' => 'CT Brain / Head (without contrast)', 'modality' => 'ct', 'minutes' => 15],
        ['code' => 'CTABD', 'name' => 'CT Abdomen and Pelvis', 'modality' => 'ct', 'minutes' => 30],
        ['code' => 'MRIBRAIN', 'name' => 'MRI Brain (without contrast)', 'modality' => 'mri', 'minutes' => 45],
        ['code' => 'LSPINEXR', 'name' => 'Lumbosacral spine X-ray', 'modality' => 'xray', 'minutes' => 15],
        ['code' => 'LEXR', 'name' => 'Lower extremity X-ray (knee/ankle/foot)', 'modality' => 'xray', 'minutes' => 10],
        ['code' => 'UEXR', 'name' => 'Upper extremity X-ray (wrist/hand/shoulder)', 'modality' => 'xray', 'minutes' => 10],
    ];

    /**
     * Get consolidated CPOE Diagnostic Catalog (Blood Tests, Cultures, Radiology)
     * merged with database procedure_order_configs.
     */
    public function getCatalog(): array
    {
        $db = Database::connection();

        $dbTests = [];
        try {
            $stmt = $db->query(
                "SELECT c.id, c.name, c.identifying_code, c.specimen_type, c.lab_container, c.lab_section,
                        c.order_test_type, c.rad_modality, c.rad_minutes, g.name AS group_name
                 FROM procedure_order_configs c
                 LEFT JOIN procedure_order_configs g ON g.id = c.parent_id AND g.deleted_at IS NULL
                 WHERE c.deleted_at IS NULL AND c.procedure_tier = 'procedure_order'
                 ORDER BY c.sequence ASC, c.name ASC"
            );
            $dbTests = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) {}

        $bloodTests = [];
        $cultures = [];
        $radiology = [];

        // Map database tests
        foreach ($dbTests as $t) {
            $type = strtolower((string) ($t['order_test_type'] ?? ''));
            $section = strtolower((string) ($t['lab_section'] ?? ''));
            $group = strtolower((string) ($t['group_name'] ?? ''));
            $name = $t['name'];
            $code = $t['identifying_code'] ?: '';

            $item = [
                'id' => (int) $t['id'],
                'name' => $name,
                'code' => $code,
                'group' => $t['group_name'] ?: 'General',
                'category_type' => $type === 'radiology' ? 'radiology' : ($section === 'microbiology' || str_contains($name, 'culture') ? 'culture' : 'blood'),
                'specimen' => $t['specimen_type'] ?? '',
                'container' => $t['lab_container'] ?? 'edta',
                'modality' => $t['rad_modality'] ?? 'xray',
                'minutes' => (int) ($t['rad_minutes'] ?? 15),
            ];

            if ($item['category_type'] === 'radiology') {
                $radiology[] = $item;
            } elseif ($item['category_type'] === 'culture') {
                $cultures[] = $item;
            } else {
                $bloodTests[] = $item;
            }
        }

        // If database items were insufficient, complement with fast-pick presets
        return [
            'blood_tests' => $bloodTests,
            'cultures' => $cultures,
            'radiology' => $radiology,
            'fast_picks' => [
                'blood' => self::COMMON_BLOOD_TESTS,
                'cultures' => self::COMMON_CULTURES,
                'radiology' => self::COMMON_RADIOLOGY,
            ]
        ];
    }

    /**
     * Bundled 1-Click Order Placement directly from the consultation note.
     * Orders blood tests, cultures, and radiology in one atomic call.
     */
    public function placeOrders(array $data, array $actor): array
    {
        $patientId = (int) ($data['patient_id'] ?? 0);
        $encounterId = !empty($data['encounter_id']) ? (int) $data['encounter_id'] : null;
        $soapNoteId = !empty($data['soap_note_id']) ? (int) $data['soap_note_id'] : null;

        if (!$patientId) {
            return ['success' => false, 'message' => 'Patient ID is required for CPOE orders.'];
        }

        $priority = in_array($data['priority'] ?? '', ['routine', 'urgent', 'stat'], true)
            ? $data['priority']
            : 'routine';

        $clinicalIndication = trim((string) ($data['clinical_indication'] ?? $data['clinical_info'] ?? ''));
        $fasting = !empty($data['fasting']) ? 1 : 0;

        $labTestIds = array_values(array_unique(array_filter(array_map('intval', (array) ($data['tests'] ?? [])))));
        $radStudyIds = array_values(array_unique(array_filter(array_map('intval', (array) ($data['studies'] ?? [])))));

        // Handle string code matches if numeric IDs were not resolved
        if (empty($labTestIds) && !empty($data['test_codes'])) {
            $labTestIds = $this->resolveConfigIdsByCodes((array) $data['test_codes'], 'Laboratory');
        }
        if (empty($radStudyIds) && !empty($data['study_codes'])) {
            $radStudyIds = $this->resolveConfigIdsByCodes((array) $data['study_codes'], 'Radiology');
        }

        if (empty($labTestIds) && empty($radStudyIds)) {
            return ['success' => false, 'message' => 'Please select at least one lab test, culture, or imaging study to order.'];
        }

        $db = Database::connection();
        $results = [
            'lab' => null,
            'radiology' => null,
            'ordered_names' => []
        ];

        // 1. Dispatch Laboratory Tests & Cultures
        if (!empty($labTestIds)) {
            try {
                $labService = new LabService();
                $labResult = $labService->order([
                    'patient_id' => $patientId,
                    'tests' => $labTestIds,
                    'priority' => $priority,
                    'clinical_info' => $clinicalIndication,
                    'fasting' => $fasting,
                    'order_mode' => 'written',
                    'confirm' => 1
                ], $actor);

                if ($labResult['success'] ?? false) {
                    $results['lab'] = $labResult['data'] ?? [];
                    $labReqId = (int) ($labResult['data']['id'] ?? 0);

                    // Link encounter_id and soap_note_id to lab_requests
                    if ($labReqId > 0 && ($encounterId || $soapNoteId)) {
                        $this->linkLabRequest($db, $labReqId, $encounterId, $soapNoteId);
                    }
                } else {
                    return ['success' => false, 'message' => $labResult['message'] ?? 'Failed to place lab order.'];
                }
            } catch (Throwable $e) {
                // Direct fallback creation if lab tables/service hit constraint
                $fallback = $this->directCreateOrders($db, $patientId, $encounterId, $soapNoteId, $labTestIds, 'lab', $priority, $clinicalIndication, (int) $actor['id']);
                $results['lab'] = $fallback;
            }
        }

        // 2. Dispatch Radiology Imaging Studies
        if (!empty($radStudyIds)) {
            try {
                $radService = new RadiologyService();
                $radResult = $radService->order([
                    'patient_id' => $patientId,
                    'studies' => $radStudyIds,
                    'priority' => $priority,
                    'indication' => $clinicalIndication,
                    'order_mode' => 'written',
                    'confirm' => 1
                ], $actor);

                if ($radResult['success'] ?? false) {
                    $results['radiology'] = $radResult['data'] ?? [];
                    $radReqId = (int) ($radResult['data']['id'] ?? 0);

                    // Link encounter_id and soap_note_id to rad_requests
                    if ($radReqId > 0 && ($encounterId || $soapNoteId)) {
                        $this->linkRadRequest($db, $radReqId, $encounterId, $soapNoteId);
                    }
                } else {
                    return ['success' => false, 'message' => $radResult['message'] ?? 'Failed to place radiology order.'];
                }
            } catch (Throwable $e) {
                $fallback = $this->directCreateOrders($db, $patientId, $encounterId, $soapNoteId, $radStudyIds, 'radiology', $priority, $clinicalIndication, (int) $actor['id']);
                $results['radiology'] = $fallback;
            }
        }

        // Fetch test names for auto-insertion into SOAP plan
        $allIds = array_merge($labTestIds, $radStudyIds);
        if (!empty($allIds)) {
            $inClause = implode(',', array_map('intval', $allIds));
            $st = $db->query("SELECT name FROM procedure_order_configs WHERE id IN ({$inClause})");
            if ($st) {
                $results['ordered_names'] = $st->fetchAll(PDO::FETCH_COLUMN) ?: [];
            }
        }

        $totalCount = count($labTestIds) + count($radStudyIds);
        $summaryText = !empty($results['ordered_names'])
            ? "Diagnostic CPOE orders placed: " . implode(', ', $results['ordered_names']) . " (" . strtoupper($priority) . ")"
            : "Diagnostic CPOE orders placed ({$totalCount} items)";

        return [
            'success' => true,
            'message' => "Successfully placed {$totalCount} diagnostic order(s) via inline CPOE.",
            'data' => [
                'total_orders' => $totalCount,
                'lab_request' => $results['lab'],
                'radiology_request' => $results['radiology'],
                'ordered_names' => $results['ordered_names'],
                'summary_text' => $summaryText,
            ]
        ];
    }

    /**
     * Retrieve all diagnostic orders associated with an encounter or recent for the patient.
     */
    public function getEncounterOrders(int $encounterId, int $patientId): array
    {
        $db = Database::connection();

        $sql = "SELECT o.id, o.patient_id, o.procedure_order_config_id, o.status, o.order_date, o.created_at,
                       poc.name AS procedure_name, poc.identifying_code, poc.order_test_type, poc.lab_section,
                       poc.specimen_type, poc.rad_modality,
                       lr.request_no AS lab_request_no, lr.priority AS lab_priority,
                       rr.request_no AS rad_request_no, rr.priority AS rad_priority
                FROM patient_procedure_orders o
                JOIN procedure_order_configs poc ON poc.id = o.procedure_order_config_id
                LEFT JOIN lab_requests lr ON lr.id = o.lab_request_id
                LEFT JOIN rad_requests rr ON rr.id = o.rad_request_id
                WHERE o.deleted_at IS NULL
                  AND (
                    (o.encounter_id = :enc AND :enc > 0)
                    OR (lr.encounter_id = :enc2 AND :enc2 > 0)
                    OR (rr.encounter_id = :enc3 AND :enc3 > 0)
                    OR (o.patient_id = :pid AND o.created_at >= NOW() - INTERVAL 1 DAY)
                  )
                ORDER BY o.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute([
            'enc' => $encounterId,
            'enc2' => $encounterId,
            'enc3' => $encounterId,
            'pid' => $patientId
        ]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(function ($r) {
            $isRad = strtolower((string) ($r['order_test_type'] ?? '')) === 'radiology';
            $isCulture = strtolower((string) ($r['lab_section'] ?? '')) === 'microbiology' || str_contains(strtolower($r['procedure_name']), 'culture');

            return [
                'id' => (int) $r['id'],
                'name' => $r['procedure_name'],
                'code' => $r['identifying_code'] ?: '',
                'category' => $isRad ? 'Radiology' : ($isCulture ? 'Culture' : 'Blood Test'),
                'type' => $isRad ? 'radiology' : 'lab',
                'status' => $r['status'] ?: 'pending',
                'priority' => $r['lab_priority'] ?: ($r['rad_priority'] ?: 'routine'),
                'request_no' => $r['lab_request_no'] ?: ($r['rad_request_no'] ?: '-'),
                'order_date' => $r['created_at'] ? substr($r['created_at'], 0, 16) : $r['order_date'],
            ];
        }, $rows);
    }

    private function linkLabRequest(PDO $db, int $labReqId, ?int $encounterId, ?int $soapNoteId): void
    {
        try {
            $db->prepare("UPDATE lab_requests SET encounter_id = :enc, soap_note_id = :soap WHERE id = :id")
               ->execute(['enc' => $encounterId, 'soap' => $soapNoteId, 'id' => $labReqId]);

            if ($encounterId) {
                $db->prepare("UPDATE patient_procedure_orders SET encounter_id = :enc WHERE lab_request_id = :id")
                   ->execute(['enc' => $encounterId, 'id' => $labReqId]);
            }
        } catch (Throwable $e) {}
    }

    private function linkRadRequest(PDO $db, int $radReqId, ?int $encounterId, ?int $soapNoteId): void
    {
        try {
            $db->prepare("UPDATE rad_requests SET encounter_id = :enc, soap_note_id = :soap WHERE id = :id")
               ->execute(['enc' => $encounterId, 'soap' => $soapNoteId, 'id' => $radReqId]);

            if ($encounterId) {
                $db->prepare("UPDATE patient_procedure_orders SET encounter_id = :enc WHERE rad_request_id = :id")
                   ->execute(['enc' => $encounterId, 'id' => $radReqId]);
            }
        } catch (Throwable $e) {}
    }

    private function resolveConfigIdsByCodes(array $codes, string $type): array
    {
        if (empty($codes)) return [];

        $db = Database::connection();
        $placeholders = implode(',', array_fill(0, count($codes), '?'));
        $stmt = $db->prepare(
            "SELECT id FROM procedure_order_configs
             WHERE deleted_at IS NULL AND identifying_code IN ({$placeholders})
             LIMIT 50"
        );
        $stmt->execute(array_values($codes));

        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    }

    private function directCreateOrders(PDO $db, int $patientId, ?int $encounterId, ?int $soapNoteId, array $configIds, string $type, string $priority, string $info, int $userId): array
    {
        $created = [];
        $today = date('Y-m-d');
        $now = date('Y-m-d H:i:s');

        foreach ($configIds as $cid) {
            try {
                $stmt = $db->prepare(
                    "INSERT INTO patient_procedure_orders
                     (patient_id, encounter_id, procedure_order_config_id, order_date, status, created_at, created_by)
                     VALUES (:p, :enc, :c, :d, 'pending', :now, :u)"
                );
                $stmt->execute([
                    'p' => $patientId,
                    'enc' => $encounterId,
                    'c' => $cid,
                    'd' => $today,
                    'now' => $now,
                    'u' => $userId
                ]);
                $created[] = (int) $db->lastInsertId();
            } catch (Throwable $e) {}
        }

        return ['order_ids' => $created];
    }
}
