<?php

namespace App\Modules\Displays\Services;

use App\Core\Database;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use PDO;

/**
 * TV displays (module 9, Phase 1: groundwork).
 *
 *   * Each TV is a registered device (patient room, nurse station, waiting room, OR) with its own
 *     display key. TVs never log in as a person: the display page sends the key with every
 *     request (X-Display-Key header) and gets only what that device is meant to show.
 *   * The key is kept as a SHA-256 hash. The admin sees it once, in the link to open on the TV,
 *     when the device is added or given a new key (the old key stops working at once).
 *   * The admin turns a TV off remotely (it shows a blank screen until turned back on), asks it
 *     to reload, and sees when each TV last checked in (online / offline).
 *
 * What each kind of TV shows is added by the later phases; here it shows the hospital, the
 * place and the time.
 */
class DisplayService
{
    public const KINDS = [
        'room' => 'Patient room', 'nurse_station' => 'Nurse station', 'waiting_room' => 'Waiting room', 'or' => 'Operating room', 'other' => 'Other',
    ];
    public const MIN_REFRESH = 10;
    public const MAX_REFRESH = 600;
    /** A TV not heard from in this many refresh periods (at least 2 minutes) is offline. */
    private const OFFLINE_PERIODS = 3;

    // ------------------------------------------------------------------
    // The TV
    // ------------------------------------------------------------------

    /** What a TV shows. Null when the key is unknown (or the device was removed). */
    public function feed(string $key, string $ip, string $userAgent): ?array
    {
        $key = trim($key);
        if ($key === '' || strlen($key) > 200) {
            return null;
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM display_devices WHERE key_hash = :h AND deleted_at IS NULL");
        $stmt->execute(['h' => hash('sha256', $key)]);
        $d = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$d) {
            return null;
        }
        $db->prepare("UPDATE display_devices SET last_seen_at = NOW(), last_ip = :ip, last_user_agent = :ua WHERE id = :id")
            ->execute(['ip' => mb_substr($ip, 0, 45), 'ua' => mb_substr($userAgent, 0, 255), 'id' => $d['id']]);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $base = [
            'now' => $now, 'refresh_seconds' => (int) $d['refresh_seconds'],
            // The TV reloads its page when this changes (the admin's "Reload").
            'reload_token' => $d['reload_requested_at'],
        ];
        if ((int) $d['is_enabled'] !== 1) {
            return $base + ['state' => 'off'];
        }
        $loc = $this->locations($db, [$d])[(int) $d['id']] ?? [];
        try {
            $biz = (new BusinessSettingService())->get();
        } catch (\Throwable $e) {
            $biz = [];
        }
        return $base + [
            'state' => 'on',
            'device' => ['id' => (int) $d['id'], 'name' => $d['name'], 'kind' => $d['kind'], 'kind_label' => self::KINDS[$d['kind']] ?? $d['kind'],
                'location' => $loc['label'] ?? null, 'location_note' => $d['location_note']],
            'hospital' => ['name' => $biz['name'] ?? 'Hospital', 'logo' => $biz['logo'] ?? null],
            // Filled in by the later phases (room TV, nurse station board, waiting room, OR).
            'content' => null,
        ];
    }

    // ------------------------------------------------------------------
    // Admin
    // ------------------------------------------------------------------

    public function list(): array
    {
        $db = Database::connection();
        $rows = $db->query(
            "SELECT d.*, TIMESTAMPDIFF(SECOND, d.last_seen_at, NOW()) AS seen_ago, " . self::nameSql('d.disabled_by') . " AS disabled_by_name
             FROM display_devices d WHERE d.deleted_at IS NULL ORDER BY FIELD(d.kind, 'nurse_station', 'room', 'waiting_room', 'or', 'other'), d.name"
        )->fetchAll(PDO::FETCH_ASSOC);
        $locs = $this->locations($db, $rows);
        return [
            'devices' => array_map(fn($d) => $this->shape($d, $locs[(int) $d['id']] ?? []), $rows),
            'now' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /** For the device form: wards, beds (with rooms), OR suites, kinds. */
    public function options(): array
    {
        $db = Database::connection();
        return [
            'kinds' => self::KINDS,
            'wards' => $db->query("SELECT id, ward_name AS name FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC),
            'beds' => $db->query("SELECT id, ward_id, room_number, bed_number FROM hospital_beds WHERE is_active = 1 ORDER BY ward_id, room_number, bed_number")->fetchAll(PDO::FETCH_ASSOC),
            'or_suites' => $db->query("SELECT id, suite_name AS name FROM or_suites WHERE is_active = 1 ORDER BY suite_name")->fetchAll(PDO::FETCH_ASSOC),
            'refresh' => ['min' => self::MIN_REFRESH, 'max' => self::MAX_REFRESH, 'default' => 30],
        ];
    }

    /** One device and what happened to it. */
    public function show(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT d.*, TIMESTAMPDIFF(SECOND, d.last_seen_at, NOW()) AS seen_ago, " . self::nameSql('d.disabled_by') . " AS disabled_by_name
             FROM display_devices d WHERE d.id = :id AND d.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $d = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$d) {
            return null;
        }
        $ev = $db->prepare("SELECT e.action, e.note, e.created_at, " . self::nameSql('e.user_id') . " AS user_name FROM display_device_events e WHERE e.device_id = :id ORDER BY e.id DESC LIMIT 30");
        $ev->execute(['id' => $id]);
        return $this->shape($d, $this->locations($db, [$d])[$id] ?? []) + ['events' => $ev->fetchAll(PDO::FETCH_ASSOC)];
    }

    /**
     * Add or change a device. data: id?, name, kind, ward_id?, bed_id?, or_suite_id?, location_note?, refresh_seconds?, notes?
     * A new device gets its key here (returned once as data.key).
     */
    public function save(array $data, array $user): array
    {
        $db = Database::connection();
        $id = (int) ($data['id'] ?? 0);
        $existing = null;
        if ($id) {
            $existing = $this->row($db, $id);
            if (!$existing) {
                return ['success' => false, 'message' => 'Display not found.', 'not_found' => true];
            }
        }
        $errors = [];
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            $errors['name'] = 'Give the TV a name, e.g. "Room 201 TV" or "Ward 3 nurse station".';
        } elseif (mb_strlen($name) > 120) {
            $errors['name'] = 'Keep it under 120 characters.';
        }
        $kind = (string) ($data['kind'] ?? '');
        if (!isset(self::KINDS[$kind])) {
            $errors['kind'] = 'Where is the TV?';
        }
        $wardId = (int) ($data['ward_id'] ?? 0) ?: null;
        $bedId = (int) ($data['bed_id'] ?? 0) ?: null;
        $suiteId = (int) ($data['or_suite_id'] ?? 0) ?: null;
        // Only what the kind uses is kept.
        if ($kind === 'room') {
            $suiteId = null;
            if (!$bedId) {
                $errors['bed_id'] = 'Which bed does the TV face?';
            } else {
                $b = $db->prepare("SELECT ward_id FROM hospital_beds WHERE id = :id");
                $b->execute(['id' => $bedId]);
                $bw = $b->fetchColumn();
                if ($bw === false) {
                    $errors['bed_id'] = 'Bed not found.';
                } else {
                    $wardId = (int) $bw;
                }
            }
        } elseif ($kind === 'nurse_station') {
            $bedId = $suiteId = null;
            if (!$wardId) {
                $errors['ward_id'] = 'Which ward\'s nurse station?';
            }
        } elseif ($kind === 'or') {
            $bedId = $wardId = null;
            if (!$suiteId) {
                $errors['or_suite_id'] = 'Which operating room?';
            }
        } else {
            $bedId = $suiteId = null;
        }
        if ($wardId && !isset($errors['ward_id'])) {
            $w = $db->prepare("SELECT 1 FROM hospital_wards WHERE id = :id");
            $w->execute(['id' => $wardId]);
            if (!$w->fetchColumn()) {
                $errors['ward_id'] = 'Ward not found.';
            }
        }
        if ($suiteId && !isset($errors['or_suite_id'])) {
            $s = $db->prepare("SELECT 1 FROM or_suites WHERE id = :id");
            $s->execute(['id' => $suiteId]);
            if (!$s->fetchColumn()) {
                $errors['or_suite_id'] = 'Operating room not found.';
            }
        }
        $refresh = trim((string) ($data['refresh_seconds'] ?? '30')) ?: '30';
        if (!ctype_digit($refresh) || (int) $refresh < self::MIN_REFRESH || (int) $refresh > self::MAX_REFRESH) {
            $errors['refresh_seconds'] = 'From ' . self::MIN_REFRESH . ' to ' . self::MAX_REFRESH . ' seconds.';
        }
        $note = trim((string) ($data['location_note'] ?? ''));
        $notes = trim((string) ($data['notes'] ?? ''));
        if (mb_strlen($note) > 200) {
            $errors['location_note'] = 'Keep it under 200 characters.';
        }
        if (mb_strlen($notes) > 500) {
            $errors['notes'] = 'Keep it under 500 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $uid = (int) ($user['id'] ?? 0) ?: null;
        $v = ['name' => $name, 'kind' => $kind, 'w' => $wardId, 'b' => $bedId, 's' => $suiteId, 'ln' => $note !== '' ? $note : null,
            'r' => (int) $refresh, 'notes' => $notes !== '' ? $notes : null, 'u' => $uid];
        $key = null;
        if ($existing) {
            $db->prepare(
                "UPDATE display_devices SET name = :name, kind = :kind, ward_id = :w, bed_id = :b, or_suite_id = :s, location_note = :ln,
                        refresh_seconds = :r, notes = :notes, updated_by = :u, updated_at = NOW() WHERE id = :id"
            )->execute($v + ['id' => $id]);
            $this->event($db, $id, 'changed', null, $uid);
        } else {
            $key = self::newKeyValue();
            $db->prepare(
                "INSERT INTO display_devices (name, kind, ward_id, bed_id, or_suite_id, location_note, key_hash, key_hint, key_set_at, refresh_seconds, notes, created_by, created_at)
                 VALUES (:name, :kind, :w, :b, :s, :ln, :h, :hint, NOW(), :r, :notes, :u, NOW())"
            )->execute($v + ['h' => hash('sha256', $key), 'hint' => substr($key, -4)]);
            $id = (int) $db->lastInsertId();
            $this->event($db, $id, 'added', null, $uid);
        }
        $out = $this->show($id);
        if ($key) {
            $out['key'] = $key;
        }
        return ['success' => true, 'message' => $existing ? 'Display saved.' : 'Display added. Open its link on the TV.', 'data' => $out];
    }

    /** A new key: the old one stops working at once. Returned once. */
    public function newKey(int $id, array $user): array
    {
        $db = Database::connection();
        if (!$this->row($db, $id)) {
            return ['success' => false, 'message' => 'Display not found.', 'not_found' => true];
        }
        $key = self::newKeyValue();
        $db->prepare("UPDATE display_devices SET key_hash = :h, key_hint = :hint, key_set_at = NOW(), last_seen_at = NULL, updated_at = NOW(), updated_by = :u WHERE id = :id")
            ->execute(['h' => hash('sha256', $key), 'hint' => substr($key, -4), 'u' => (int) ($user['id'] ?? 0) ?: null, 'id' => $id]);
        $this->event($db, $id, 'new_key', 'The old key stopped working', (int) ($user['id'] ?? 0) ?: null);
        return ['success' => true, 'message' => 'New key made. The TV needs the new link; the old one no longer works.', 'data' => $this->show($id) + ['key' => $key]];
    }

    /** Turn the TV off (blank screen) or back on. */
    public function setEnabled(int $id, bool $on, string $reason, array $user): array
    {
        $db = Database::connection();
        $d = $this->row($db, $id);
        if (!$d) {
            return ['success' => false, 'message' => 'Display not found.', 'not_found' => true];
        }
        if ((int) $d['is_enabled'] === ($on ? 1 : 0)) {
            return ['success' => true, 'message' => $on ? 'Already on.' : 'Already off.', 'data' => $this->show($id)];
        }
        $uid = (int) ($user['id'] ?? 0) ?: null;
        $db->prepare("UPDATE display_devices SET is_enabled = :e, disabled_at = IF(:e2 = 1, NULL, NOW()), disabled_by = IF(:e3 = 1, NULL, :u), updated_at = NOW() WHERE id = :id")
            ->execute(['e' => $on ? 1 : 0, 'e2' => $on ? 1 : 0, 'e3' => $on ? 1 : 0, 'u' => $uid, 'id' => $id]);
        $reason = trim($reason);
        $this->event($db, $id, $on ? 'turned_on' : 'turned_off', $reason !== '' ? mb_substr($reason, 0, 300) : null, $uid);
        $wait = (int) $d['refresh_seconds'];
        return ['success' => true, 'message' => ($on ? 'Turned on' : 'Turned off') . ". The TV follows within {$wait} seconds.", 'data' => $this->show($id)];
    }

    /** Ask the TV to reload its page (e.g. after an update). */
    public function reload(int $id, array $user): array
    {
        $db = Database::connection();
        $d = $this->row($db, $id);
        if (!$d) {
            return ['success' => false, 'message' => 'Display not found.', 'not_found' => true];
        }
        $db->prepare("UPDATE display_devices SET reload_requested_at = NOW() WHERE id = :id")->execute(['id' => $id]);
        $this->event($db, $id, 'reload', null, (int) ($user['id'] ?? 0) ?: null);
        return ['success' => true, 'message' => "The TV reloads within {$d['refresh_seconds']} seconds.", 'data' => $this->show($id)];
    }

    /** Remove: its key stops working; the TV shows "not registered". */
    public function delete(int $id, array $user): array
    {
        $db = Database::connection();
        if (!$this->row($db, $id)) {
            return ['success' => false, 'message' => 'Display not found.', 'not_found' => true];
        }
        $uid = (int) ($user['id'] ?? 0) ?: null;
        // The key hash is replaced so the old key can never match again.
        $db->prepare("UPDATE display_devices SET deleted_at = NOW(), deleted_by = :u, key_hash = :h WHERE id = :id")
            ->execute(['u' => $uid, 'h' => hash('sha256', 'removed:' . $id . ':' . bin2hex(random_bytes(16))), 'id' => $id]);
        $this->event($db, $id, 'removed', null, $uid);
        return ['success' => true, 'message' => 'Display removed. Its link no longer works.'];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private static function newKeyValue(): string
    {
        return bin2hex(random_bytes(24));   // 48 hex characters
    }

    private function row(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare("SELECT * FROM display_devices WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function event(PDO $db, int $id, string $action, ?string $note, ?int $userId): void
    {
        $db->prepare("INSERT INTO display_device_events (device_id, action, note, user_id, created_at) VALUES (:d, :a, :n, :u, NOW())")
            ->execute(['d' => $id, 'a' => $action, 'n' => $note, 'u' => $userId]);
    }

    /** device id => [label, ward, room, bed, suite]. */
    private function locations(PDO $db, array $devices): array
    {
        $wards = $db->query("SELECT id, ward_name FROM hospital_wards")->fetchAll(PDO::FETCH_KEY_PAIR);
        $suites = $db->query("SELECT id, suite_name FROM or_suites")->fetchAll(PDO::FETCH_KEY_PAIR);
        $bedIds = array_filter(array_map(fn($d) => (int) $d['bed_id'], $devices));
        $beds = [];
        if ($bedIds) {
            foreach ($db->query("SELECT id, ward_id, room_number, bed_number FROM hospital_beds WHERE id IN (" . implode(',', $bedIds) . ")")->fetchAll(PDO::FETCH_ASSOC) as $b) {
                $beds[(int) $b['id']] = $b;
            }
        }
        $out = [];
        foreach ($devices as $d) {
            $ward = $d['ward_id'] ? ($wards[$d['ward_id']] ?? null) : null;
            $bed = $d['bed_id'] ? ($beds[(int) $d['bed_id']] ?? null) : null;
            $suite = $d['or_suite_id'] ? ($suites[$d['or_suite_id']] ?? null) : null;
            $label = match ($d['kind']) {
                'room' => trim(($ward ? "{$ward} · " : '') . ($bed ? trim("{$bed['room_number']} · Bed {$bed['bed_number']}") : '')),
                'nurse_station' => $ward ? "{$ward} nurse station" : null,
                'or' => $suite,
                default => $d['location_note'],
            };
            $out[(int) $d['id']] = ['label' => $label ?: ($d['location_note'] ?: null), 'ward' => $ward, 'room' => $bed['room_number'] ?? null,
                'bed' => $bed['bed_number'] ?? null, 'suite' => $suite];
        }
        return $out;
    }

    private function shape(array $d, array $loc): array
    {
        $refresh = (int) $d['refresh_seconds'];
        $seen = $d['seen_ago'] !== null ? (int) $d['seen_ago'] : null;
        $online = $seen !== null && $seen <= max(120, self::OFFLINE_PERIODS * $refresh);
        return [
            'id' => (int) $d['id'], 'name' => $d['name'], 'kind' => $d['kind'], 'kind_label' => self::KINDS[$d['kind']] ?? $d['kind'],
            'ward_id' => $d['ward_id'] !== null ? (int) $d['ward_id'] : null, 'bed_id' => $d['bed_id'] !== null ? (int) $d['bed_id'] : null,
            'or_suite_id' => $d['or_suite_id'] !== null ? (int) $d['or_suite_id'] : null,
            'location' => $loc['label'] ?? null, 'location_note' => $d['location_note'], 'notes' => $d['notes'],
            'refresh_seconds' => $refresh, 'enabled' => (int) $d['is_enabled'] === 1,
            'disabled_at' => $d['disabled_at'], 'disabled_by_name' => $d['disabled_at'] ? ($d['disabled_by_name'] ?? null) : null,
            'key_hint' => $d['key_hint'], 'key_set_at' => $d['key_set_at'],
            'last_seen_at' => $d['last_seen_at'], 'seen_ago' => $seen, 'online' => $online, 'never_seen' => $d['last_seen_at'] === null,
            'last_ip' => $d['last_ip'], 'last_user_agent' => $d['last_user_agent'], 'reload_requested_at' => $d['reload_requested_at'],
        ];
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
