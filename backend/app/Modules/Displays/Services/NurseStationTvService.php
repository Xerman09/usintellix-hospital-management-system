<?php

namespace App\Modules\Displays\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\InpatientOrders\Services\MarService;
use App\Modules\InpatientVitals\Services\InpatientVitalsService;
use PDO;

/**
 * The nurse station TV (module 9, Phase 3): every patient on the ward, one line each --
 * room and bed, initials (never the full name: the screen faces the corridor), the nurse this
 * shift, the early warning score (NEWS2), unacknowledged critical labs, medicines overdue,
 * and alerts waiting to be acknowledged. A Code Blue on the ward and critical alerts flash
 * at the top (type and place, never the alert's text, which may name the patient).
 */
class NurseStationTvService
{
    /** Critical alerts older than this no longer flash (they stay in the bell until acknowledged). */
    private const BANNER_HOURS = 12;

    public function content(array $device): array
    {
        $db = Database::connection();
        $wardId = (int) $device['ward_id'];
        $w = $db->prepare("SELECT ward_name FROM hospital_wards WHERE id = :id");
        $w->execute(['id' => $wardId]);
        $wardName = (string) $w->fetchColumn();

        $stmt = $db->prepare(
            "SELECT a.id FROM inpatient_admissions a JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.ward_id = :w AND a.status IN ('Admitted', 'Pending Discharge') ORDER BY b.room_number, b.bed_number"
        );
        $stmt->execute(['w' => $wardId]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        if (!$ids) {
            return ['ward' => $wardName, 'patients' => [], 'totals' => self::totals([]), 'banner' => []];
        }
        $in = implode(',', $ids);
        $sum = (new InpatientVitalsService())->summaries($ids);
        $mar = [];
        foreach ((new MarService())->board(['ward_id' => $wardId], [])['patients'] as $p) {
            $mar[$p['admission_id']] = $p;
        }
        $names = $db->query("SELECT id, patient_name, patient_id, status FROM inpatient_admissions WHERE id IN ({$in})")->fetchAll(PDO::FETCH_UNIQUE | PDO::FETCH_ASSOC);
        $pids = array_filter(array_map(fn($r) => (int) $r['patient_id'], $names));
        $alerts = [];
        if ($pids) {
            // Alerts still waiting for someone to acknowledge, per patient.
            $rows = $db->query(
                "SELECT id, patient_id, alert_type, urgency, created_at FROM alerts
                 WHERE patient_id IN (" . implode(',', $pids) . ") AND resolved_at IS NULL AND requires_ack = 1 AND acknowledged_at IS NULL
                   AND alert_type <> 'code_blue' ORDER BY id"
            )->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                $alerts[(int) $r['patient_id']][] = $r;
            }
        }

        $patients = [];
        $banner = [];
        $cutoff = strtotime((string) $db->query("SELECT NOW() - INTERVAL " . self::BANNER_HOURS . " HOUR")->fetchColumn());
        foreach ($ids as $id) {
            $s = $sum[$id] ?? null;
            $n = $names[$id] ?? [];
            $pid = (int) ($n['patient_id'] ?? 0);
            $mine = $alerts[$pid] ?? [];
            $crit = count(array_filter($mine, fn($a) => $a['alert_type'] === 'critical_lab'));
            $other = array_values(array_filter($mine, fn($a) => $a['alert_type'] !== 'critical_lab'));
            $m = $mar[$id]['counts'] ?? null;
            $p = [
                'admission_id' => $id, 'room' => $s['room'] ?? null, 'bed' => $s['bed'] ?? null,
                'initials' => self::initials((string) ($n['patient_name'] ?? '')),
                'nurse' => $s['nurse_name'] ?? null, 'cna' => $s['cna_name'] ?? null,
                'news2' => $s && $s['news2'] ? ['score' => $s['news2']['score'], 'risk' => $s['news2']['risk']] : null,
                'vitals' => $s ? $s['status']['state'] : null,
                'critical_labs' => $crit,
                'meds_overdue' => $m ? (int) $m['late'] : 0,
                'meds_high_alert_late' => (bool) ($mar[$id]['late_high_alert'] ?? false),
                'alerts' => count($other), 'alerts_critical' => count(array_filter($other, fn($a) => $a['urgency'] === 'critical')),
                'fall_risk' => $s['fall_risk'] ?? null, 'isolation' => $s['isolation'] ?? null,
                'pending_discharge' => ($n['status'] ?? '') === 'Pending Discharge',
            ];
            $patients[] = $p;
            foreach ($mine as $a) {
                if ($a['urgency'] === 'critical' && strtotime($a['created_at']) >= $cutoff) {
                    $banner[] = ['kind' => $a['alert_type'], 'label' => AlertService::TYPES[$a['alert_type']] ?? 'Critical alert', 'room' => $p['room'], 'bed' => $p['bed'],
                        'initials' => $p['initials'], 'since' => $a['created_at']];
                }
            }
        }
        usort($banner, fn($x, $y) => strcmp($y['since'], $x['since']));
        return ['ward' => $wardName, 'patients' => $patients, 'totals' => self::totals($patients), 'banner' => array_slice($banner, 0, 6)];
    }

    /** "Generoso Beltran Flores" -> "G.F." (first and last name). */
    public static function initials(string $name): string
    {
        $parts = preg_split('/\s+/u', trim(preg_replace('/[^\p{L}\s\'-]/u', ' ', $name)), -1, PREG_SPLIT_NO_EMPTY);
        if (!$parts) {
            return '—';
        }
        $first = mb_strtoupper(mb_substr($parts[0], 0, 1));
        $last = count($parts) > 1 ? mb_strtoupper(mb_substr($parts[count($parts) - 1], 0, 1)) : '';
        return $first . '.' . ($last !== '' ? $last . '.' : '');
    }

    private static function totals(array $patients): array
    {
        return [
            'patients' => count($patients),
            'news2_high' => count(array_filter($patients, fn($p) => ($p['news2']['score'] ?? 0) >= 7)),
            'news2_medium' => count(array_filter($patients, fn($p) => ($p['news2']['score'] ?? 0) >= 5 && ($p['news2']['score'] ?? 0) < 7)),
            'critical_labs' => array_sum(array_column($patients, 'critical_labs')),
            'meds_overdue' => array_sum(array_column($patients, 'meds_overdue')),
            'vitals_overdue' => count(array_filter($patients, fn($p) => $p['vitals'] === 'overdue')),
            'alerts' => array_sum(array_column($patients, 'alerts')),
        ];
    }
}
