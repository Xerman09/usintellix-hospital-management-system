<?php

namespace App\Modules\Suppliers\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\DrugInventoryService;
use App\Modules\Suppliers\Models\Supplier;
use PDO;

class SupplierService
{
    public const SUPPLIER_TYPES = ['Distributor', 'Manufacturer', 'Wholesaler', 'Importer', 'Retail Pharmacy', 'Equipment Vendor', 'Other'];

    public const PAYMENT_TERMS = ['Cash on Delivery', 'Cash in Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'Consignment'];

    /** Days before LTO expiry at which a supplier is flagged. */
    public const LICENSE_WARNING_DAYS = 60;

    private const TEXT_FIELDS = [
        'name' => 255, 'supplier_type' => 50, 'contact_person' => 150, 'phone' => 50, 'mobile' => 50,
        'email' => 150, 'website' => 255, 'address_line' => 255, 'city' => 100, 'province' => 100,
        'postal_code' => 20, 'country' => 100, 'tin' => 20, 'fda_license_number' => 100, 'payment_terms' => 50
    ];

    public const INPUT_FIELDS = [
        'name', 'supplier_type', 'product_types', 'contact_person', 'phone', 'mobile', 'email', 'website',
        'address_line', 'city', 'province', 'postal_code', 'country', 'tin', 'fda_license_number',
        'license_expiry', 'payment_terms', 'lead_time_days', 'notes', 'is_active'
    ];

    /**
     * Supplier list with delivery stats: how many receipts came from
     * each supplier, when the last one arrived, and how many distinct
     * catalog items they've delivered or are the preferred source for.
     */
    public function list(array $filters = []): array
    {
        $where = ['s.deleted_at IS NULL'];
        $params = [];

        if (empty($filters['show_inactive'])) {
            $where[] = 's.is_active = 1';
        }

        if (!empty($filters['id'])) {
            $where[] = 's.id = :id';
            $params['id'] = (int) $filters['id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT s.*,
                    COALESCE(r.receipt_count, 0) AS receipt_count,
                    r.last_received,
                    COALESCE(it.item_count, 0) AS item_count,
                    COALESCE(pr.product_count, 0) AS product_count,
                    COALESCE(pr.promo_count, 0) AS promo_count
             FROM suppliers s
             LEFT JOIN (
                 SELECT supplier_id, COUNT(*) AS receipt_count, MAX(received_date) AS last_received
                 FROM drug_inventory_receipts
                 WHERE supplier_id IS NOT NULL
                 GROUP BY supplier_id
             ) r ON r.supplier_id = s.id
             LEFT JOIN (
                 SELECT supplier_id, COUNT(DISTINCT drug_id) AS item_count
                 FROM (
                     SELECT supplier_id, drug_id FROM drug_inventory_receipts WHERE supplier_id IS NOT NULL
                     UNION
                     SELECT preferred_supplier_id, id FROM drugs WHERE preferred_supplier_id IS NOT NULL AND deleted_at IS NULL
                 ) links
                 GROUP BY supplier_id
             ) it ON it.supplier_id = s.id
             LEFT JOIN (
                 SELECT sp.supplier_id,
                        COUNT(DISTINCT sp.drug_id) AS product_count,
                        SUM(sp.discount_type <> 'none'
                            AND (sp.discount_starts IS NULL OR sp.discount_starts <= CURDATE())
                            AND (sp.discount_ends IS NULL OR sp.discount_ends >= CURDATE())) AS promo_count
                 FROM supplier_products sp
                 JOIN drugs d ON d.id = sp.drug_id AND d.deleted_at IS NULL
                 WHERE sp.deleted_at IS NULL AND sp.is_active = 1
                 GROUP BY sp.supplier_id
             ) pr ON pr.supplier_id = s.id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY s.name ASC"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->format($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * One supplier plus the catalog items tied to it: anything ever
     * received from them (with last date/cost and total quantity) and
     * anything that names them as preferred supplier.
     */
    public function get(int $id): ?array
    {
        $rows = $this->list(['id' => $id, 'show_inactive' => true]);

        if (!$rows) {
            return null;
        }

        $stmt = Database::connection()->prepare(
            "SELECT d.id, d.name, d.product_type, d.is_active,
                    d.preferred_supplier_id = :id1 AS is_preferred,
                    du.name AS unit_name,
                    r.receipt_count, r.total_quantity, r.last_received,
                    (SELECT r2.unit_cost FROM drug_inventory_receipts r2
                      WHERE r2.drug_id = d.id AND r2.supplier_id = :id2
                      ORDER BY r2.received_date DESC, r2.id DESC LIMIT 1) AS last_unit_cost
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN (
                 SELECT drug_id, COUNT(*) AS receipt_count, SUM(quantity) AS total_quantity, MAX(received_date) AS last_received
                 FROM drug_inventory_receipts
                 WHERE supplier_id = :id3
                 GROUP BY drug_id
             ) r ON r.drug_id = d.id
             WHERE d.deleted_at IS NULL AND (d.preferred_supplier_id = :id4 OR r.drug_id IS NOT NULL)
             ORDER BY d.name"
        );
        $stmt->execute(['id1' => $id, 'id2' => $id, 'id3' => $id, 'id4' => $id]);

        $supplier = $rows[0];
        $supplier['items'] = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'product_type' => $r['product_type'],
            'is_active' => (bool) $r['is_active'],
            'is_preferred' => (bool) $r['is_preferred'],
            'unit_name' => $r['unit_name'],
            'receipt_count' => (int) ($r['receipt_count'] ?? 0),
            'total_quantity' => $r['total_quantity'] !== null ? (float) $r['total_quantity'] : 0.0,
            'last_received' => $r['last_received'],
            'last_unit_cost' => $r['last_unit_cost'] !== null ? (float) $r['last_unit_cost'] : null
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return $supplier;
    }

    public function create(array $data, int $userId): array
    {
        [$values, $errors] = $this->normalize($data);

        if (!$errors) {
            $errors = $this->findConflicts($values);
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $userId;

        $id = (new Supplier())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save the supplier.'];
        }

        $code = 'SUP-' . str_pad((string) $id, 4, '0', STR_PAD_LEFT);
        (new Supplier())->update(['code' => $code], $id);

        return ['success' => true, 'message' => "Supplier {$values['name']} added.", 'data' => ['id' => $id, 'code' => $code]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $existing = (new Supplier())->where('id', $id)->first();

        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Supplier not found.'];
        }

        [$values, $errors] = $this->normalize($data);

        if (!$errors) {
            $errors = $this->findConflicts($values, $id);
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $userId;

        (new Supplier())->update($values, $id);

        return ['success' => true, 'message' => 'Supplier updated.'];
    }

    /**
     * Soft-deletes a supplier that has never delivered anything. One with
     * delivery history should be deactivated instead so receipts keep a
     * meaningful link.
     */
    public function remove(int $id, int $userId): array
    {
        $existing = (new Supplier())->where('id', $id)->first();

        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Supplier not found.'];
        }

        $db = Database::connection();
        $stmt = $db->prepare("SELECT COUNT(*) FROM drug_inventory_receipts WHERE supplier_id = :id");
        $stmt->execute(['id' => $id]);

        if ((int) $stmt->fetchColumn() > 0) {
            return ['success' => false, 'message' => 'This supplier has delivery records. Mark it inactive instead of deleting it.'];
        }

        $db->prepare(
            "UPDATE drugs SET preferred_supplier_id = NULL, updated_at = :now, updated_by = :user
             WHERE preferred_supplier_id = :id"
        )->execute(['now' => date('Y-m-d H:i:s'), 'user' => $userId, 'id' => $id]);

        (new Supplier())->update(['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => $userId], $id);

        return ['success' => true, 'message' => 'Supplier deleted.'];
    }

    /**
     * Bulk-add suppliers from parsed CSV rows. Each row is validated and
     * saved on its own so one bad row doesn't block the rest; failures
     * are reported by CSV line (header = line 1).
     */
    public function import(array $rows, int $userId): array
    {
        if (count($rows) > 1000) {
            return ['success' => false, 'message' => 'Import at most 1000 rows at a time.'];
        }

        $created = 0;
        $failed = [];

        foreach (array_values($rows) as $index => $row) {
            $input = [];

            foreach ((array) $row as $key => $value) {
                $input[$key] = is_string($value) ? trim($value) : $value;
            }

            foreach (['supplier_type' => self::SUPPLIER_TYPES, 'payment_terms' => self::PAYMENT_TERMS] as $field => $allowed) {
                foreach ($allowed as $option) {
                    if (!empty($input[$field]) && strcasecmp($option, $input[$field]) === 0) {
                        $input[$field] = $option;
                    }
                }
            }

            if (isset($input['product_types']) && is_string($input['product_types'])) {
                $types = preg_split('/[;,|]/', $input['product_types']);
                $input['product_types'] = array_map(function ($type) {
                    foreach (DrugInventoryService::PRODUCT_TYPES as $option) {
                        if (strcasecmp($option, trim($type)) === 0) {
                            return $option;
                        }
                    }

                    return trim($type);
                }, $types);
            }

            if (!empty($input['license_expiry'])) {
                $input['license_expiry'] = self::normalizeDate($input['license_expiry']);
            }

            if (isset($input['is_active']) && is_string($input['is_active'])) {
                $input['is_active'] = $input['is_active'] === '' || in_array(strtolower($input['is_active']), ['1', 'yes', 'y', 'true', 'active'], true);
            }

            $result = $this->create(array_intersect_key($input, array_flip(self::INPUT_FIELDS)), $userId);

            if ($result['success']) {
                $created++;
            } else {
                $failed[] = [
                    'row' => $index + 2,
                    'name' => $input['name'] ?? '',
                    'errors' => array_values($result['errors'] ?? [$result['message']])
                ];
            }
        }

        return [
            'success' => true,
            'message' => "Imported {$created} supplier(s)" . ($failed ? ', ' . count($failed) . ' row(s) skipped.' : '.'),
            'data' => ['created' => $created, 'failed' => $failed]
        ];
    }

    /**
     * Spreadsheets love to reformat dates. Accepts YYYY-MM-DD as well as
     * M/D/YYYY (how Excel shows dates on PH/US-locale machines) and
     * returns YYYY-MM-DD; anything else is returned untouched so normal
     * validation reports it.
     */
    public static function normalizeDate(string $value): string
    {
        $value = trim($value);

        if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/', $value, $m)) {
            return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $value, $m)) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[1], $m[2]);
        }

        return $value;
    }

    /** Active suppliers as id+name, for dropdowns elsewhere. */
    public function listActiveForSelect(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, code FROM suppliers WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
        );
        $stmt->execute();

        return array_map(fn(array $r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'code' => $r['code']], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function normalize(array $data): array
    {
        $values = [];
        $errors = [];

        foreach (self::TEXT_FIELDS as $field => $max) {
            $value = trim((string) ($data[$field] ?? ''));
            $values[$field] = $value === '' ? null : $value;

            if ($value !== '' && mb_strlen($value) > $max) {
                $errors[$field] = "Must be {$max} characters or fewer.";
            }
        }

        $values['notes'] = trim((string) ($data['notes'] ?? '')) ?: null;
        $values['country'] = $values['country'] ?? 'Philippines';
        $values['supplier_type'] = $values['supplier_type'] ?? 'Distributor';
        $values['is_active'] = array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1;

        if ($values['name'] === null) {
            $errors['name'] = 'Supplier name is required.';
        }

        if (!in_array($values['supplier_type'], self::SUPPLIER_TYPES, true)) {
            $errors['supplier_type'] = 'Choose a valid supplier type.';
        }

        if ($values['payment_terms'] !== null && !in_array($values['payment_terms'], self::PAYMENT_TERMS, true)) {
            $errors['payment_terms'] = 'Choose valid payment terms.';
        }

        $types = $data['product_types'] ?? [];
        $types = is_array($types) ? $types : explode(',', (string) $types);
        $types = array_values(array_unique(array_filter(array_map('trim', $types))));
        $invalid = array_diff($types, DrugInventoryService::PRODUCT_TYPES);

        if ($invalid) {
            $errors['product_types'] = 'Unknown product type: ' . implode(', ', $invalid) . '.';
        }

        $values['product_types'] = $types ? implode(',', $types) : null;

        if ($values['email'] !== null && !filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }

        if ($values['website'] !== null) {
            $url = preg_match('#^https?://#i', $values['website']) ? $values['website'] : 'https://' . $values['website'];

            if (!filter_var($url, FILTER_VALIDATE_URL)) {
                $errors['website'] = 'Enter a valid website address.';
            } else {
                $values['website'] = $url;
            }
        }

        foreach (['phone', 'mobile'] as $field) {
            if ($values[$field] !== null && !preg_match('/^[0-9+()\-.\s\/]{6,}$/', $values[$field])) {
                $errors[$field] = 'Use digits and + ( ) - only.';
            }
        }

        // PH TIN: 9 digits, optionally followed by a 3-5 digit branch code.
        if ($values['tin'] !== null) {
            $digits = preg_replace('/\D/', '', $values['tin']);

            if (strlen($digits) < 9 || strlen($digits) > 14) {
                $errors['tin'] = 'TIN should be 9 to 14 digits, e.g. 123-456-789-000.';
            } else {
                $values['tin'] = implode('-', str_split(substr($digits, 0, 9), 3)) . (strlen($digits) > 9 ? '-' . substr($digits, 9) : '');
            }
        }

        $expiry = trim((string) ($data['license_expiry'] ?? ''));
        $values['license_expiry'] = $expiry === '' ? null : $expiry;

        if ($values['license_expiry'] !== null) {
            $date = \DateTime::createFromFormat('Y-m-d', $values['license_expiry']);

            if (!$date || $date->format('Y-m-d') !== $values['license_expiry']) {
                $errors['license_expiry'] = 'Enter a valid date.';
            }
        }

        $lead = $data['lead_time_days'] ?? '';
        $values['lead_time_days'] = ($lead === '' || $lead === null) ? null : (int) $lead;

        if ($values['lead_time_days'] !== null && ($values['lead_time_days'] < 0 || $values['lead_time_days'] > 365)) {
            $errors['lead_time_days'] = 'Lead time must be between 0 and 365 days.';
        }

        return [$values, $errors];
    }

    private function findConflicts(array $values, ?int $ignoreId = null): array
    {
        $db = Database::connection();
        $errors = [];

        $stmt = $db->prepare(
            "SELECT code FROM suppliers WHERE deleted_at IS NULL AND id <> :ignore AND LOWER(TRIM(name)) = :name LIMIT 1"
        );
        $stmt->execute(['ignore' => (int) $ignoreId, 'name' => mb_strtolower($values['name'])]);

        if (($code = $stmt->fetchColumn()) !== false) {
            $errors['name'] = "A supplier with this name already exists ({$code}).";
        }

        if ($values['tin'] !== null) {
            $stmt = $db->prepare("SELECT name FROM suppliers WHERE deleted_at IS NULL AND id <> :ignore AND tin = :tin LIMIT 1");
            $stmt->execute(['ignore' => (int) $ignoreId, 'tin' => $values['tin']]);

            if (($owner = $stmt->fetchColumn()) !== false) {
                $errors['tin'] = "This TIN is already used by {$owner}.";
            }
        }

        return $errors;
    }

    private function format(array $r): array
    {
        $licenseStatus = null;

        if ($r['license_expiry']) {
            $days = (int) floor((strtotime($r['license_expiry']) - strtotime(date('Y-m-d'))) / 86400);
            $licenseStatus = $days < 0 ? 'expired' : ($days <= self::LICENSE_WARNING_DAYS ? 'expiring' : 'valid');
        }

        return [
            'id' => (int) $r['id'],
            'code' => $r['code'],
            'name' => $r['name'],
            'supplier_type' => $r['supplier_type'],
            'product_types' => $r['product_types'] ? explode(',', $r['product_types']) : [],
            'contact_person' => $r['contact_person'],
            'phone' => $r['phone'],
            'mobile' => $r['mobile'],
            'email' => $r['email'],
            'website' => $r['website'],
            'address_line' => $r['address_line'],
            'city' => $r['city'],
            'province' => $r['province'],
            'postal_code' => $r['postal_code'],
            'country' => $r['country'],
            'tin' => $r['tin'],
            'fda_license_number' => $r['fda_license_number'],
            'license_expiry' => $r['license_expiry'],
            'license_status' => $licenseStatus,
            'payment_terms' => $r['payment_terms'],
            'lead_time_days' => $r['lead_time_days'] !== null ? (int) $r['lead_time_days'] : null,
            'notes' => $r['notes'],
            'is_active' => (bool) $r['is_active'],
            'receipt_count' => (int) $r['receipt_count'],
            'last_received' => $r['last_received'],
            'item_count' => (int) $r['item_count'],
            'product_count' => (int) $r['product_count'],
            'promo_count' => (int) $r['promo_count']
        ];
    }
}
