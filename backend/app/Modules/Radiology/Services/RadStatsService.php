<?php

namespace App\Modules\Radiology\Services;

use App\Core\Database;
use PDO;

/**
 * Radiology (module 15, Phase 3): the radiology report -- turnaround, volume per machine and charges -- for a date
 * range, optionally one modality or one machine.
 *
 *   * Turnaround, for the studies ordered in the period: order -> booked, order -> scan, scan -> report and the
 *     whole way order -> report, each with the median, the mean, the 90th percentile and the share within target.
 *   * Volume per machine (by the day of the scan, not of the order): studies booked, performed, patients who did
 *     not come, cancelled bookings, the minutes used against the hours the machine works (utilisation), the images
 *     stored and how long its studies took to report.
 *   * Workload: studies per day, by priority, by modality, by where the request came from, and the busiest studies.
 *     Still open (to schedule, to scan, to report), cancelled studies, critical findings, addenda and corrections.
 *   * Charges: the imaging charges posted in the period (gross, discounts, net, voided) and the reported studies
 *     that could not be charged because the study has no price.
 */
class RadStatsService
{
    public const ROLES = ['admin', 'radiologic_technologist', 'doctor', 'clinician'];
    /** Minutes from the order to the booking being made. */
    public const TARGET_BOOK = RadiologyService::OVERDUE;
    /** Minutes from the order to the scan. */
    public const TARGET_SCAN = ['stat' => 60, 'urgent' => 240, 'routine' => 2880];
    /** Minutes from the scan to the signed report. */
    public const TARGET_REPORT = RadReportService::OVERDUE;
    /** Minutes from the order to the signed report. */
    public const TARGET_TOTAL = ['stat' => 120, 'urgent' => 480, 'routine' => 4320];

    public function report(?string $from, ?string $to, ?string $modality = null, ?int $roomId = null): array
    {
        $db = Database::connection();
        [$from, $to, $now] = $this->period($db, $from, $to);
        $start = "{$from} 00:00:00";
        $stop = "{$to} 23:59:59";
        $modality = $modality !== null && isset(RadiologyService::MODALITIES[$modality]) ? $modality : null;
        $roomId = $roomId ?: null;
        $rows = $this->studies($db, $start, $stop, $modality, $roomId);
        $days = count(self::range($from, $to));
        $month = $days > 62;

        $open = ['to_schedule' => 0, 'to_scan' => 0, 'to_report' => 0];
        $cancelled = 0;
        $noShows = 0;
        $criticals = 0;
        $addenda = 0;
        $corrections = 0;
        $images = 0;
        $performedN = 0;
        $reportedN = 0;
        $agg = ['priority' => [], 'modality' => [], 'study' => [], 'source' => []];
        $series = [];
        foreach (self::range($from, $to) as $d) {
            $k = $month ? substr($d, 0, 7) : $d;
            $series[$k] ??= ['period' => $month ? "{$k}-01" : $k, 'ordered' => 0, 'performed' => 0, 'reported' => 0, 'stat' => 0, 'tat_sum' => 0, 'tat_n' => 0];
        }
        $key = fn($dt) => $month ? substr((string) $dt, 0, 7) : substr((string) $dt, 0, 10);

        foreach ($rows as $r) {
            $p = isset(RadiologyService::PRIORITIES[$r['priority']]) ? $r['priority'] : 'routine';
            $book = $r['booked_at'] ? self::mins($r['ordered_at'], $r['booked_at']) : null;
            $scan = $r['performed_at'] ? self::mins($r['ordered_at'], $r['performed_at']) : null;
            $read = $r['performed_at'] && $r['signed_at'] ? self::mins($r['performed_at'], $r['signed_at']) : null;
            $total = $r['signed_at'] ? self::mins($r['ordered_at'], $r['signed_at']) : null;
            $isCancelled = $r['status'] === 'cancelled';
            $cancelled += (int) $isCancelled;
            $noShows += (int) $r['no_shows'];
            $criticals += (int) ($r['conclusion'] === 'critical');
            $addenda += (int) $r['addenda'];
            $corrections += (int) $r['corrections'];
            $images += (int) $r['images'];
            $performedN += (int) ($scan !== null);
            $reportedN += (int) ($total !== null);
            if (!$isCancelled && $total === null) {
                $open[$r['performed_at'] !== null ? 'to_report' : ($r['booked_at'] !== null ? 'to_scan' : 'to_schedule')]++;
            }

            $where = ['priority' => $p, 'modality' => $r['rad_modality'] ?: 'other', 'study' => $r['study_name'], 'source' => $r['source'] ?: 'other'];
            foreach ($where as $which => $k) {
                $b = &$agg[$which][$k];
                $b ??= ['studies' => 0, 'performed' => 0, 'reported' => 0, 'cancelled' => 0, 'criticals' => 0, 'book' => [], 'scan' => [], 'read' => [],
                    'total' => [], 'in_scan' => 0, 'in_total' => 0, 'charged' => 0.0];
                $b['studies']++;
                $b['cancelled'] += (int) $isCancelled;
                $b['criticals'] += (int) ($r['conclusion'] === 'critical');
                if ($book !== null) {
                    $b['book'][] = $book;
                }
                if ($scan !== null) {
                    $b['performed']++;
                    $b['scan'][] = $scan;
                    $b['in_scan'] += (int) ($scan <= self::TARGET_SCAN[$p]);
                }
                if ($read !== null) {
                    $b['read'][] = $read;
                }
                if ($total !== null) {
                    $b['reported']++;
                    $b['total'][] = $total;
                    $b['in_total'] += (int) ($total <= self::TARGET_TOTAL[$p]);
                }
                if ($r['charge_net'] !== null) {
                    $b['charged'] += (float) $r['charge_net'];
                }
                unset($b);
            }

            $k = $key($r['ordered_at']);
            if (isset($series[$k])) {
                $series[$k]['ordered']++;
                $series[$k]['stat'] += (int) ($p === 'stat');
            }
            if ($r['performed_at'] && isset($series[$key($r['performed_at'])])) {
                $series[$key($r['performed_at'])]['performed']++;
            }
            if ($r['signed_at'] && isset($series[$key($r['signed_at'])])) {
                $series[$key($r['signed_at'])]['reported']++;
                $series[$key($r['signed_at'])]['tat_sum'] += $total;
                $series[$key($r['signed_at'])]['tat_n']++;
            }
        }

        $all = ['book' => [], 'scan' => [], 'read' => [], 'total' => []];
        $within = ['scan' => 0, 'total' => 0];
        foreach ($agg['priority'] as $b) {
            foreach ($all as $k => $_) {
                $all[$k] = array_merge($all[$k], $b[$k]);
            }
            $within['scan'] += $b['in_scan'];
            $within['total'] += $b['in_total'];
        }

        $priorities = [];
        foreach (RadiologyService::PRIORITIES as $k => $label) {
            $b = $agg['priority'][$k] ?? null;
            $priorities[] = ['key' => $k, 'label' => $label, 'target_scan' => self::TARGET_SCAN[$k], 'target_report' => self::TARGET_REPORT[$k],
                'target_total' => self::TARGET_TOTAL[$k], 'studies' => $b['studies'] ?? 0, 'performed' => $b['performed'] ?? 0, 'reported' => $b['reported'] ?? 0,
                'book' => self::stats($b['book'] ?? []), 'scan' => self::stats($b['scan'] ?? []), 'read' => self::stats($b['read'] ?? []),
                'total' => self::stats($b['total'] ?? []),
                'within_scan_pct' => !empty($b['performed']) ? round(100 * $b['in_scan'] / $b['performed'], 1) : null,
                'within_total_pct' => !empty($b['reported']) ? round(100 * $b['in_total'] / $b['reported'], 1) : null];
        }

        $modalities = [];
        foreach ($agg['modality'] as $k => $b) {
            $modalities[] = ['key' => $k, 'label' => RadiologyService::MODALITIES[$k] ?? $k, 'studies' => $b['studies'], 'performed' => $b['performed'],
                'reported' => $b['reported'], 'criticals' => $b['criticals'], 'scan' => self::stats($b['scan']), 'read' => self::stats($b['read']),
                'total' => self::stats($b['total']), 'within_total_pct' => $b['reported'] ? round(100 * $b['in_total'] / $b['reported'], 1) : null,
                'charged' => round($b['charged'], 2)];
        }
        usort($modalities, fn($a, $b) => $b['studies'] <=> $a['studies']);

        $studies = [];
        foreach ($agg['study'] as $name => $b) {
            $studies[] = ['name' => $name, 'studies' => $b['studies'], 'performed' => $b['performed'], 'reported' => $b['reported'],
                'cancelled' => $b['cancelled'], 'criticals' => $b['criticals'], 'total' => self::stats($b['total']),
                'within_total_pct' => $b['reported'] ? round(100 * $b['in_total'] / $b['reported'], 1) : null, 'charged' => round($b['charged'], 2)];
        }
        usort($studies, fn($a, $b) => [$b['studies'], $a['name']] <=> [$a['studies'], $b['name']]);

        $sources = [];
        foreach ($agg['source'] as $k => $b) {
            $sources[] = ['key' => $k, 'label' => RadiologyService::SOURCES[$k] ?? $k, 'studies' => $b['studies'], 'reported' => $b['reported'],
                'total' => self::stats($b['total']), 'within_total_pct' => $b['reported'] ? round(100 * $b['in_total'] / $b['reported'], 1) : null];
        }
        usort($sources, fn($a, $b) => $b['studies'] <=> $a['studies']);

        $n = count($rows);
        $elapsed = max(1, count(array_filter(self::range($from, $to), fn($d) => $d <= substr($now, 0, 10))));
        return [
            'from' => $from, 'to' => $to, 'days' => $days, 'now' => $now, 'modality' => $modality, 'room_id' => $roomId,
            'group' => $month ? 'month' : 'day', 'modalities_list' => RadiologyService::MODALITIES, 'priorities' => RadiologyService::PRIORITIES,
            'rooms' => (new RadiologyService())->rooms(null, false),
            'totals' => [
                'requests' => count(array_unique(array_column($rows, 'request_id'))),
                'studies' => $n, 'per_day' => round($n / $elapsed, 1),
                'performed' => $performedN, 'reported' => $reportedN, 'cancelled' => $cancelled, 'no_shows' => $noShows, 'images' => $images,
                'stat' => $agg['priority']['stat']['studies'] ?? 0, 'criticals' => $criticals, 'addenda' => $addenda, 'corrections' => $corrections,
                'to_schedule' => $open['to_schedule'], 'to_scan' => $open['to_scan'], 'to_report' => $open['to_report'],
                'book' => self::stats($all['book']), 'scan' => self::stats($all['scan']), 'read' => self::stats($all['read']), 'total' => self::stats($all['total']),
                'within_scan_pct' => $performedN ? round(100 * $within['scan'] / $performedN, 1) : null,
                'within_total_pct' => $reportedN ? round(100 * $within['total'] / $reportedN, 1) : null,
            ],
            'priority_rows' => $priorities,
            'modalities' => $modalities,
            'machines' => $this->machines($db, $from, $to, $modality, $roomId, $now),
            'studies' => array_slice($studies, 0, 40),
            'study_count' => count($studies),
            'sources' => $sources,
            'series' => array_values(array_map(fn($x) => $x + ['mean_tat' => $x['tat_n'] ? (int) round($x['tat_sum'] / $x['tat_n']) : null], $series)),
            'charges' => $this->charges($db, $from, $to, $modality, $roomId),
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** One row per imaging study ordered in the period, with when it was booked, scanned and first reported. */
    private function studies(PDO $db, string $start, string $stop, ?string $modality, ?int $roomId): array
    {
        $st = $db->prepare(
            "SELECT o.id AS order_id, o.status, c.name AS study_name, c.identifying_code AS code, c.rad_modality, c.rad_minutes, c.rad_price,
                    r.id AS request_id, r.ordered_at, COALESCE(o.priority, r.priority) AS priority, r.source, r.needed_by,
                    b.id AS booking_id, b.room_id, b.start_at, b.minutes, b.status AS booking_status, b.performed_at, b.booked_at, b.arrived_at, b.prep_given,
                    (SELECT MIN(rp.signed_at) FROM rad_reports rp WHERE rp.order_id = o.id AND rp.signed_at IS NOT NULL) AS signed_at,
                    (SELECT rp.conclusion FROM rad_reports rp WHERE rp.order_id = o.id AND rp.status = 'signed' ORDER BY rp.version DESC LIMIT 1) AS conclusion,
                    (SELECT COUNT(*) FROM rad_reports rp WHERE rp.order_id = o.id AND rp.signed_at IS NOT NULL AND rp.is_addendum = 1) AS addenda,
                    (SELECT COUNT(*) FROM rad_reports rp WHERE rp.order_id = o.id AND rp.signed_at IS NOT NULL AND rp.version > 1 AND rp.is_addendum = 0) AS corrections,
                    (SELECT COUNT(*) FROM rad_images i WHERE i.order_id = o.id AND i.deleted_at IS NULL) AS images,
                    (SELECT COUNT(*) FROM rad_bookings bb WHERE bb.order_id = o.id AND bb.status = 'no_show') AS no_shows,
                    (SELECT ch.net_amount FROM rad_charges ch WHERE ch.order_id = o.id AND ch.status = 'charged' LIMIT 1) AS charge_net
             FROM patient_procedure_orders o
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             JOIN rad_requests r ON r.id = o.rad_request_id
             LEFT JOIN rad_bookings b ON b.id = o.rad_booking_id
             WHERE o.deleted_at IS NULL AND r.ordered_at >= :start AND r.ordered_at <= :stop"
            . ($modality ? " AND c.rad_modality = :mod" : '')
            . ($roomId ? " AND b.room_id = :room" : '')
        );
        $st->execute(['start' => $start, 'stop' => $stop] + ($modality ? ['mod' => $modality] : []) + ($roomId ? ['room' => $roomId] : []));
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Per machine, by the day of the scan: what it did and how full it was. */
    private function machines(PDO $db, string $from, string $to, ?string $modality, ?int $roomId, string $now): array
    {
        $rad = new RadiologyService();
        $out = [];
        foreach ($rad->rooms(null, false) as $room) {
            if (($roomId && $room['id'] !== $roomId) || ($modality && $room['modality'] !== $modality)) {
                continue;
            }
            $st = $db->prepare(
                "SELECT b.status, b.minutes, b.start_at, b.performed_at,
                        (SELECT MIN(rp.signed_at) FROM rad_reports rp WHERE rp.order_id = b.order_id AND rp.signed_at IS NOT NULL) AS signed_at,
                        (SELECT COUNT(*) FROM rad_images i WHERE i.order_id = b.order_id AND i.deleted_at IS NULL) AS images,
                        (SELECT ch.net_amount FROM rad_charges ch WHERE ch.order_id = b.order_id AND ch.status = 'charged' LIMIT 1) AS charge_net
                 FROM rad_bookings b JOIN patient_procedure_orders o ON o.id = b.order_id AND o.deleted_at IS NULL
                 JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
                 WHERE b.room_id = :room AND DATE(b.start_at) >= :from AND DATE(b.start_at) <= :to"
                . ($modality ? " AND c.rad_modality = :mod" : '')
            );
            $st->execute(['room' => $room['id'], 'from' => $from, 'to' => $to] + ($modality ? ['mod' => $modality] : []));
            $booked = 0;
            $performed = 0;
            $noShow = 0;
            $cancelled = 0;
            $minutes = 0;
            $images = 0;
            $charged = 0.0;
            $read = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $b) {
                if ($b['status'] === 'cancelled') {
                    $cancelled++;
                    continue;
                }
                if ($b['status'] === 'no_show') {
                    $noShow++;
                    continue;
                }
                $booked++;
                $minutes += (int) $b['minutes'];
                $images += (int) $b['images'];
                $charged += $b['charge_net'] !== null ? (float) $b['charge_net'] : 0.0;
                if ($b['performed_at']) {
                    $performed++;
                    if ($b['signed_at']) {
                        $read[] = self::mins($b['performed_at'], $b['signed_at']);
                    }
                }
            }
            // The hours the machine works, over the elapsed part of the period.
            $openMinutes = 0;
            foreach (self::range($from, $to) as $d) {
                if ($d > substr($now, 0, 10)) {
                    break;
                }
                $openMinutes += $rad->openMinutesOn($room, $d);
            }
            $out[] = [
                'room' => $room, 'booked' => $booked, 'performed' => $performed, 'no_show' => $noShow, 'cancelled' => $cancelled,
                'minutes' => $minutes, 'open_minutes' => $openMinutes, 'images' => $images, 'charged' => round($charged, 2),
                'utilisation_pct' => $openMinutes > 0 ? round(100 * $minutes / $openMinutes, 1) : null,
                'per_day' => $booked ? round($booked / max(1, count(array_filter(self::range($from, $to), fn($d) => $d <= substr($now, 0, 10)))), 1) : 0.0,
                'read' => self::stats($read),
                'no_show_pct' => $booked + $noShow > 0 ? round(100 * $noShow / ($booked + $noShow), 1) : null,
            ];
        }
        usort($out, fn($a, $b) => [$b['performed'], $b['booked']] <=> [$a['performed'], $a['booked']]);
        return $out;
    }

    /** The imaging charges posted in the period (by charge date), and the reported studies that have no price. */
    private function charges(PDO $db, string $from, string $to, ?string $modality, ?int $roomId): array
    {
        $st = $db->prepare(
            "SELECT ch.status, ch.gross_amount, ch.discount_amount, ch.net_amount, ch.discount_type
             FROM rad_charges ch
             JOIN patient_procedure_orders o ON o.id = ch.order_id
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE ch.charge_date >= :from AND ch.charge_date <= :to"
            . ($modality ? " AND c.rad_modality = :mod" : '')
            . ($roomId ? " AND ch.room_id = :room" : '')
        );
        $st->execute(['from' => $from, 'to' => $to] + ($modality ? ['mod' => $modality] : []) + ($roomId ? ['room' => $roomId] : []));
        $charged = 0;
        $voided = 0;
        $gross = 0.0;
        $discount = 0.0;
        $net = 0.0;
        $discounted = 0;
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $c) {
            if ($c['status'] !== 'charged') {
                $voided++;
                continue;
            }
            $charged++;
            $gross += (float) $c['gross_amount'];
            $discount += (float) $c['discount_amount'];
            $net += (float) $c['net_amount'];
            $discounted += (int) ($c['discount_type'] !== null);
        }
        $st = $db->prepare(
            "SELECT c.name, COUNT(*) AS studies FROM rad_reports rp
             JOIN patient_procedure_orders o ON o.id = rp.order_id AND o.deleted_at IS NULL
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN rad_bookings b ON b.id = o.rad_booking_id
             WHERE rp.status = 'signed' AND rp.signed_at >= :from AND rp.signed_at <= :stop
               AND NOT EXISTS (SELECT 1 FROM rad_charges ch WHERE ch.order_id = o.id AND ch.status = 'charged')"
            . ($modality ? " AND c.rad_modality = :mod" : '')
            . ($roomId ? " AND b.room_id = :room" : '')
            . " GROUP BY c.id, c.name ORDER BY studies DESC, c.name"
        );
        $st->execute(['from' => "{$from} 00:00:00", 'stop' => "{$to} 23:59:59"] + ($modality ? ['mod' => $modality] : []) + ($roomId ? ['room' => $roomId] : []));
        $uncharged = $st->fetchAll(PDO::FETCH_ASSOC);
        return ['charged' => $charged, 'voided' => $voided, 'gross' => round($gross, 2), 'discount' => round($discount, 2), 'net' => round($net, 2),
            'discounted' => $discounted, 'uncharged' => array_map(fn($u) => ['name' => $u['name'], 'studies' => (int) $u['studies']], $uncharged),
            'uncharged_total' => array_sum(array_map(fn($u) => (int) $u['studies'], $uncharged))];
    }

    /** ['count', 'median', 'mean', 'p90'] in minutes. */
    private static function stats(array $v): array
    {
        if (!$v) {
            return ['count' => 0, 'median' => null, 'mean' => null, 'p90' => null];
        }
        sort($v);
        $n = count($v);
        $median = $n % 2 ? $v[intdiv($n, 2)] : ($v[$n / 2 - 1] + $v[$n / 2]) / 2;
        return ['count' => $n, 'median' => round($median), 'mean' => round(array_sum($v) / $n), 'p90' => $v[min($n - 1, (int) ceil(0.9 * $n) - 1)]];
    }

    private static function mins(string $a, string $b): int
    {
        return max(0, intdiv(self::ts($b) - self::ts($a), 60));
    }

    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable(substr($dt, 0, 19), new \DateTimeZone('UTC')))->getTimestamp();
    }

    /** Every date from $from to $to. */
    private static function range(string $from, string $to): array
    {
        $out = [];
        $d = substr($from, 0, 10);
        $end = substr($to, 0, 10);
        while ($d <= $end && count($out) < 1000) {
            $out[] = $d;
            $d = self::shift($d, 1);
        }
        return $out;
    }

    private static function shift(string $date, int $days): string
    {
        return (new \DateTimeImmutable(substr($date, 0, 10), new \DateTimeZone('UTC')))->modify(($days >= 0 ? '+' : '') . "{$days} day")->format('Y-m-d');
    }

    /** [from, to, now]: dates (default the last 30 days); at most 2 years. */
    private function period(PDO $db, ?string $from, ?string $to): array
    {
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $today = substr($now, 0, 10);
        $ok = fn($d) => $d && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && date('Y-m-d', strtotime($d)) === $d;
        $to = $ok($to) ? $to : $today;
        $from = $ok($from) ? $from : self::shift($to, -29);
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        if (self::shift($from, 731) < $to) {
            $from = self::shift($to, -730);
        }
        return [$from, $to, $now];
    }
}
