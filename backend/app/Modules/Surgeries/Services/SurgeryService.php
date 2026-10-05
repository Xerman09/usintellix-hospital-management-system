<?php

namespace App\Modules\Surgeries\Services;

use App\Core\Database;
use App\Modules\Specializations\Services\SpecializationService;
use PDO;
use Throwable;

/**
 * Setup > Surgeries: the catalog of surgery types.
 *
 * Each surgery belongs to a specialization (which is what the OR booking
 * filters surgeons by) and carries its defaults for booking: code
 * (PhilHealth RVS), Major / Minor / Endoscopy, duration, anesthesia,
 * wound class, whether the side must be given, whether blood or implants
 * are usually needed, and the OR fee.
 *
 * The preference card lists what the surgery usually needs: instrument
 * sets (by name) and supplies / medicines from the Drug Catalog, with
 * quantities. Later phases reserve, deduct and charge from it.
 *
 * The plain list (GET /surgeries) is also the patient chart's "past
 * surgeries" picker, so it keeps id / name / description.
 */
class SurgeryService
{
    public const CATEGORIES = ['Major', 'Minor', 'Endoscopy'];

    public const WOUND_CLASSES = ['Clean', 'Clean-Contaminated', 'Contaminated', 'Dirty'];

    /** Same values the OR booking form uses. */
    public const ANESTHESIA_TYPES = [
        'General' => 'General (Endotracheal)',
        'General (TIVA)' => 'General (TIVA - Total Intravenous)',
        'Spinal' => 'Spinal',
        'Epidural' => 'Epidural',
        'MAC / Sedation' => 'MAC / Monitored Anesthesia Care',
        'Regional Block' => 'Regional Nerve Block',
        'Local' => 'Local'
    ];

    public const ITEM_TYPES = ['instrument' => 'Instrument set', 'supply' => 'Supply', 'medicine' => 'Medicine'];

    private const FLAGS = ['requires_laterality', 'usually_needs_blood', 'usually_needs_implants'];

    /** Filters: specialization_id?, include_inactive?, q? */
    public function list(array $filters = []): array
    {
        $where = ['su.deleted_at IS NULL'];
        $params = [];

        if (empty($filters['include_inactive'])) {
            $where[] = 'su.is_active = 1';
        }
        if (!empty($filters['specialization_id'])) {
            $where[] = 'su.specialization_id = :spec';
            $params['spec'] = (int) $filters['specialization_id'];
        }
        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $where[] = '(su.name LIKE :q1 OR su.code LIKE :q2)';
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $params += ['q1' => $like, 'q2' => $like];
        }

        $stmt = Database::connection()->prepare(
            "SELECT su.id, su.name, su.description, su.specialization_id, su.code, su.category, su.default_duration_minutes,
                    su.default_anesthesia_type, su.wound_class, su.requires_laterality, su.usually_needs_blood, su.usually_needs_implants,
                    su.default_or_fee, su.default_surgeon_fee, su.default_anesthesia_fee, su.philhealth_case_rate_code, su.philhealth_case_rate_amount,
                    su.is_active, su.created_at, su.updated_at,
                    s.name AS specialization_name, s.category AS specialization_category,
                    (SELECT COUNT(*) FROM surgery_preference_items i WHERE i.surgery_id = su.id) AS item_count
             FROM surgeries su
             LEFT JOIN specializations s ON s.id = su.specialization_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY su.name"
        );
        $stmt->execute($params);

        return array_map([$this, 'format'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** One surgery with its preference card. */
    public function get(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT su.*, s.name AS specialization_name, s.category AS specialization_category, 0 AS item_count
             FROM surgeries su LEFT JOIN specializations s ON s.id = su.specialization_id
             WHERE su.id = :id AND su.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $surgery = $this->format($row);
        $surgery['preference_items'] = $this->items($id);
        $surgery['item_count'] = count($surgery['preference_items']);

        return $surgery;
    }

    /** The preference card. */
    public function items(int $surgeryId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT i.id, i.item_type, i.drug_id, i.name, i.quantity, i.notes, i.sort_order,
                    d.name AS drug_name, d.is_active AS drug_active, du.name AS unit_name
             FROM surgery_preference_items i
             LEFT JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE i.surgery_id = :id ORDER BY i.sort_order, i.id"
        );
        $stmt->execute(['id' => $surgeryId]);

        return array_map(fn($r) => [
            'id' => (int) $r['id'],
            'item_type' => $r['item_type'],
            'item_type_label' => self::ITEM_TYPES[$r['item_type']] ?? $r['item_type'],
            'drug_id' => $r['drug_id'] !== null ? (int) $r['drug_id'] : null,
            'name' => $r['drug_name'] ?? $r['name'],
            'unit_name' => $r['unit_name'],
            'quantity' => (float) $r['quantity'],
            'notes' => $r['notes'],
            'drug_inactive' => $r['drug_id'] !== null && !(int) $r['drug_active']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Lists for the form. */
    public function options(): array
    {
        $db = Database::connection();

        return [
            'specializations' => (new SpecializationService())->list(),
            'categories' => self::CATEGORIES,
            'wound_classes' => self::WOUND_CLASSES,
            'anesthesia_types' => array_map(fn($k, $v) => ['value' => $k, 'label' => $v], array_keys(self::ANESTHESIA_TYPES), self::ANESTHESIA_TYPES),
            'item_types' => array_map(fn($k, $v) => ['value' => $k, 'label' => $v], array_keys(self::ITEM_TYPES), self::ITEM_TYPES),
            // Supplies and medicines for the preference card.
            'drugs' => array_map(fn($r) => [
                'id' => (int) $r['id'], 'name' => $r['name'], 'unit_name' => $r['unit_name'],
                'is_consumable' => (bool) $r['is_consumable'], 'product_type' => $r['product_type']
            ], $db->query(
                "SELECT d.id, d.name, d.is_consumable, d.product_type, du.name AS unit_name
                 FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 WHERE d.deleted_at IS NULL AND d.is_active = 1
                 ORDER BY d.name"
            )->fetchAll(PDO::FETCH_ASSOC))
        ];
    }

    public function register(array $data, int $createdBy): array
    {
        return $this->save(null, $data, $createdBy);
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        return $this->save($id, $data, $updatedBy);
    }

    /**
     * data: name, description?, specialization_id, code?, category,
     * default_duration_minutes, default_anesthesia_type?, wound_class?,
     * requires_laterality, usually_needs_blood, usually_needs_implants,
     * default_or_fee?, is_active?, preference_items? [{item_type, drug_id?, name?, quantity, notes?}]
     * Items are replaced only when preference_items is sent.
     */
    private function save(?int $id, array $data, int $userId): array
    {
        $db = Database::connection();

        if ($id) {
            $stmt = $db->prepare("SELECT * FROM surgeries WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $id]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$existing) {
                return ['success' => false, 'message' => 'Surgery not found.', 'not_found' => true];
            }
        }

        [$values, $errors] = $this->validate($data, $id, $existing ?? null);
        $items = null;
        if (array_key_exists('preference_items', $data)) {
            [$items, $itemErrors] = $this->validateItems($data['preference_items']);
            $errors += $itemErrors;
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Check the highlighted fields.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        $owns = !$db->inTransaction();

        try {
            if ($owns) {
                $db->beginTransaction();
            }

            if ($id) {
                $set = implode(', ', array_map(fn($k) => "{$k} = :{$k}", array_keys($values)));
                $db->prepare("UPDATE surgeries SET {$set}, updated_at = :now, updated_by = :user WHERE id = :id")
                    ->execute($values + ['now' => $now, 'user' => $userId, 'id' => $id]);
            } else {
                $cols = array_keys($values);
                $db->prepare(
                    "INSERT INTO surgeries (" . implode(', ', $cols) . ", created_at, created_by)
                     VALUES (:" . implode(', :', $cols) . ", :now, :user)"
                )->execute($values + ['now' => $now, 'user' => $userId]);
                $id = (int) $db->lastInsertId();
            }

            if ($items !== null) {
                $db->prepare("DELETE FROM surgery_preference_items WHERE surgery_id = :id")->execute(['id' => $id]);
                $insert = $db->prepare(
                    "INSERT INTO surgery_preference_items (surgery_id, item_type, drug_id, name, quantity, notes, sort_order, created_at, created_by)
                     VALUES (:s, :type, :drug, :name, :qty, :notes, :sort, :now, :user)"
                );
                foreach ($items as $i => $item) {
                    $insert->execute(['s' => $id, 'type' => $item['item_type'], 'drug' => $item['drug_id'], 'name' => $item['name'],
                        'qty' => $item['quantity'], 'notes' => $item['notes'], 'sort' => $i, 'now' => $now, 'user' => $userId]);
                }
            }

            if ($owns) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($owns && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        return ['success' => true, 'message' => isset($existing) ? 'Surgery updated successfully.' : 'Surgery created successfully.',
            'data' => ['surgery_id' => $id]];
    }

    /** [values for the surgeries row, errors] */
    private function validate(array $data, ?int $id, ?array $existing): array
    {
        $errors = [];
        $text = fn($key, $max) => ($v = trim((string) ($data[$key] ?? ''))) === '' ? null : mb_substr($v, 0, $max);

        $name = $text('name', 255);
        if ($name === null) {
            $errors['name'] = 'Enter the name of the surgery.';
        } else {
            $stmt = Database::connection()->prepare("SELECT id, deleted_at FROM surgeries WHERE name = :name" . ($id ? " AND id <> :id" : ""));
            $stmt->execute(['name' => $name] + ($id ? ['id' => $id] : []));
            $dup = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($dup) {
                $errors['name'] = $dup['deleted_at'] === null
                    ? 'A surgery with this name already exists.'
                    : 'A deleted surgery still uses this name. Choose another name.';
            }
        }

        $specId = (int) ($data['specialization_id'] ?? 0);
        $spec = $specId ? (SpecializationService::byId([$specId])[$specId] ?? null) : null;
        if (!$spec) {
            $errors['specialization_id'] = 'Choose the specialization that performs this surgery.';
        } elseif (!(int) $spec['is_active'] && (int) ($existing['specialization_id'] ?? 0) !== $specId) {
            $errors['specialization_id'] = 'That specialization is switched off. Choose another.';
        }

        $code = $text('code', 30);
        if ($code !== null) {
            $stmt = Database::connection()->prepare("SELECT name FROM surgeries WHERE code = :code AND deleted_at IS NULL" . ($id ? " AND id <> :id" : ""));
            $stmt->execute(['code' => $code] + ($id ? ['id' => $id] : []));
            if ($other = $stmt->fetchColumn()) {
                $errors['code'] = "This code is already used by {$other}.";
            }
        }

        $category = (string) ($data['category'] ?? 'Major');
        if (!in_array($category, self::CATEGORIES, true)) {
            $errors['category'] = 'Choose Major, Minor or Endoscopy.';
        }

        $duration = filter_var($data['default_duration_minutes'] ?? null, FILTER_VALIDATE_INT);
        if ($duration === false || $duration < 5 || $duration > 1440) {
            $errors['default_duration_minutes'] = 'Enter the usual duration in minutes (5 to 1440).';
        }

        $anesthesia = $text('default_anesthesia_type', 40);
        if ($anesthesia !== null && !isset(self::ANESTHESIA_TYPES[$anesthesia])) {
            $errors['default_anesthesia_type'] = 'Choose an anesthesia type from the list.';
        }

        $wound = $text('wound_class', 30);
        if ($wound !== null && !in_array($wound, self::WOUND_CLASSES, true)) {
            $errors['wound_class'] = 'Choose a wound class from the list.';
        }

        // Fees (and the PhilHealth case rate, kept for later): an amount, or blank.
        $amount = function (string $key, string $label) use ($data, &$errors) {
            $raw = trim((string) ($data[$key] ?? ''));
            if ($raw === '') {
                return null;
            }
            if (!is_numeric($raw) || (float) $raw < 0) {
                $errors[$key] = "Enter the {$label} as an amount, or leave it blank.";
                return null;
            }
            return round((float) $raw, 2);
        };
        $fee = $amount('default_or_fee', 'OR fee');
        $surgeonFee = $amount('default_surgeon_fee', 'surgeon\'s fee');
        $anesthesiaFee = $amount('default_anesthesia_fee', 'anesthesia fee');
        $caseRate = $amount('philhealth_case_rate_amount', 'case rate');

        $flag = fn($key) => in_array((string) ($data[$key] ?? ''), ['1', 'true', 'on'], true) || ($data[$key] ?? null) === true ? 1 : 0;

        $values = [
            'name' => $name,
            'description' => $text('description', 255),
            'specialization_id' => $specId ?: null,
            'code' => $code,
            'category' => $category,
            'default_duration_minutes' => $duration ?: 60,
            'default_anesthesia_type' => $anesthesia,
            'wound_class' => $wound,
            'default_or_fee' => $fee,
            'default_surgeon_fee' => $surgeonFee,
            'default_anesthesia_fee' => $anesthesiaFee,
            'philhealth_case_rate_code' => $text('philhealth_case_rate_code', 30),
            'philhealth_case_rate_amount' => $caseRate,
            'is_active' => array_key_exists('is_active', $data) ? $flag('is_active') : (int) ($existing['is_active'] ?? 1)
        ];
        foreach (self::FLAGS as $key) {
            $values[$key] = $flag($key);
        }

        return [$values, $errors];
    }

    /** [clean items, errors] */
    private function validateItems($raw): array
    {
        $raw = is_array($raw) ? array_values(array_filter($raw, 'is_array')) : [];
        $items = [];
        $errors = [];
        $drugIds = array_filter(array_map(fn($i) => (int) ($i['drug_id'] ?? 0), $raw));
        $drugs = [];
        if ($drugIds) {
            foreach (Database::connection()->query("SELECT id, name FROM drugs WHERE deleted_at IS NULL AND id IN (" . implode(',', $drugIds) . ")")->fetchAll(PDO::FETCH_ASSOC) as $d) {
                $drugs[(int) $d['id']] = $d['name'];
            }
        }

        foreach ($raw as $n => $item) {
            $type = (string) ($item['item_type'] ?? '');
            $drugId = (int) ($item['drug_id'] ?? 0) ?: null;
            $name = trim((string) ($item['name'] ?? ''));
            $qty = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_FLOAT);
            $key = "preference_items.{$n}";

            if (!isset(self::ITEM_TYPES[$type])) {
                $errors[$key] = 'Choose instrument set, supply or medicine.';
                continue;
            }
            if ($type === 'instrument') {
                $drugId = null;
                if ($name === '') {
                    $errors[$key] = 'Name the instrument set.';
                    continue;
                }
            } else {
                if (!$drugId || !isset($drugs[$drugId])) {
                    $errors[$key] = 'Choose the supply or medicine from the Drug Catalog.';
                    continue;
                }
                $name = $drugs[$drugId];
            }
            if ($qty === false || $qty <= 0 || $qty > 100000) {
                $errors[$key] = 'Enter a quantity above zero.';
                continue;
            }

            $items[] = ['item_type' => $type, 'drug_id' => $drugId, 'name' => mb_substr($name, 0, 255), 'quantity' => round($qty, 2),
                'notes' => ($notes = trim((string) ($item['notes'] ?? ''))) === '' ? null : mb_substr($notes, 0, 255)];
        }

        return [$items, $errors];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $stmt = Database::connection()->prepare("SELECT id FROM surgeries WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        if (!$stmt->fetchColumn()) {
            return ['success' => false, 'message' => 'Surgery not found.'];
        }

        Database::connection()->prepare("UPDATE surgeries SET deleted_at = :deleted_at, deleted_by = :deleted_by WHERE id = :id")
            ->execute(['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => $deletedBy, 'id' => $id]);

        return ['success' => true, 'message' => 'Surgery deleted successfully.'];
    }

    private function format(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'description' => $r['description'],
            'specialization_id' => $r['specialization_id'] !== null ? (int) $r['specialization_id'] : null,
            'specialization_name' => $r['specialization_name'],
            'specialization_category' => $r['specialization_category'],
            'code' => $r['code'],
            'category' => $r['category'],
            'default_duration_minutes' => (int) $r['default_duration_minutes'],
            'default_anesthesia_type' => $r['default_anesthesia_type'],
            'wound_class' => $r['wound_class'],
            'requires_laterality' => (bool) $r['requires_laterality'],
            'usually_needs_blood' => (bool) $r['usually_needs_blood'],
            'usually_needs_implants' => (bool) $r['usually_needs_implants'],
            'default_or_fee' => $r['default_or_fee'] !== null ? (float) $r['default_or_fee'] : null,
            'default_surgeon_fee' => $r['default_surgeon_fee'] !== null ? (float) $r['default_surgeon_fee'] : null,
            'default_anesthesia_fee' => $r['default_anesthesia_fee'] !== null ? (float) $r['default_anesthesia_fee'] : null,
            'philhealth_case_rate_code' => $r['philhealth_case_rate_code'],
            'philhealth_case_rate_amount' => $r['philhealth_case_rate_amount'] !== null ? (float) $r['philhealth_case_rate_amount'] : null,
            'is_active' => (bool) $r['is_active'],
            'item_count' => (int) $r['item_count'],
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at']
        ];
    }
}
