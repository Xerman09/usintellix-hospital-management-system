<?php

namespace App\Modules\SupplyCatalog\Services;

use App\Core\Database;
use PDO;
use Throwable;

class SupplyCatalogService
{
    /**
     * Generate Sequential Item Code SUP-{CATEGORY_PREFIX}-0001
     */
    public static function generateItemCode(PDO $pdo, string $category): string
    {
        $prefixMap = [
            'medical_surgical' => 'MS',
            'ppe_infection_control' => 'PPE',
            'wound_care' => 'WC',
            'respiratory_airway' => 'RA',
            'catheters_tubing' => 'CT',
            'laboratory_disposables' => 'LAB',
            'radiology_supplies' => 'RAD',
            'linen_bedding' => 'LB',
            'cleaning_disinfectants' => 'CD',
            'office_administrative' => 'ADM'
        ];
        $catCode = $prefixMap[$category] ?? 'GEN';
        $year = (int)date('Y');

        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('SUPPLY_ITEM', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'SUPPLY_ITEM' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("SUP-%s-%04d", $catCode, $num);
    }

    /**
     * Executive Overview & Inventory Valuation Metrics
     */
    public function getExecutiveMetrics(): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                COUNT(*) as total_items,
                SUM(current_stock * standard_cost) as total_inventory_valuation,
                SUM(CASE WHEN current_stock <= min_safety_stock AND status = 'active' THEN 1 ELSE 0 END) as low_stock_alerts,
                SUM(CASE WHEN current_stock = 0 AND status = 'active' THEN 1 ELSE 0 END) as stockout_count,
                SUM(CASE WHEN is_billable_to_patient = 1 THEN 1 ELSE 0 END) as billable_items_count,
                SUM(CASE WHEN is_billable_to_patient = 0 THEN 1 ELSE 0 END) as non_billable_overhead_count
            FROM `supply_catalog_items`
        ";
        $m = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC) ?: [];

        // Category breakdown
        $stmtCat = $pdo->query("
            SELECT
                category,
                COUNT(*) as item_count,
                SUM(current_stock) as total_units_on_hand,
                SUM(current_stock * standard_cost) as category_valuation,
                SUM(CASE WHEN current_stock <= min_safety_stock THEN 1 ELSE 0 END) as low_stock_items
            FROM `supply_catalog_items`
            WHERE `status` != 'discontinued'
            GROUP BY category
            ORDER BY item_count DESC
        ");
        $categories = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total_items' => (int)($m['total_items'] ?? 0),
            'total_inventory_valuation' => round((float)($m['total_inventory_valuation'] ?? 0), 2),
            'low_stock_alerts' => (int)($m['low_stock_alerts'] ?? 0),
            'stockout_count' => (int)($m['stockout_count'] ?? 0),
            'billable_items_count' => (int)($m['billable_items_count'] ?? 0),
            'non_billable_overhead_count' => (int)($m['non_billable_overhead_count'] ?? 0),
            'category_breakdown' => $categories
        ];
    }

    /**
     * List Non-Pharma Supply Catalog Items
     */
    public function listItems(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['category'])) {
            $where[] = "sci.category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['status'])) {
            $where[] = "sci.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['sterility_type'])) {
            $where[] = "sci.sterility_type = ?";
            $params[] = $filters['sterility_type'];
        }

        if (isset($filters['is_billable_to_patient']) && $filters['is_billable_to_patient'] !== '') {
            $where[] = "sci.is_billable_to_patient = ?";
            $params[] = (int)$filters['is_billable_to_patient'];
        }

        if (!empty($filters['low_stock_only'])) {
            $where[] = "sci.current_stock <= sci.min_safety_stock AND sci.status = 'active'";
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(sci.item_name LIKE ? OR sci.item_code LIKE ? OR sci.brand_manufacturer LIKE ? OR sci.barcode_sku LIKE ? OR sci.preferred_supplier_name LIKE ? OR sci.sub_category LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM `supply_catalog_items` sci WHERE {$whereClause}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT
                sci.*,
                ROUND(sci.current_stock * sci.standard_cost, 2) as inventory_value,
                CASE
                    WHEN sci.current_stock <= 0 THEN 'stockout'
                    WHEN sci.current_stock <= sci.min_safety_stock THEN 'low_stock'
                    WHEN sci.max_stock_level > 0 AND sci.current_stock >= sci.max_stock_level THEN 'overstocked'
                    ELSE 'adequate'
                END as stock_health_status
            FROM `supply_catalog_items` sci
            WHERE {$whereClause}
            ORDER BY sci.category ASC, sci.item_name ASC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records,
            'metrics' => $this->getExecutiveMetrics()
        ];
    }

    /**
     * Get Item Detail with Department Par Levels
     */
    public function getItemDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("SELECT * FROM `supply_catalog_items` WHERE id = ?");
        $stmt->execute([$id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$item) return null;

        // Fetch department par stock allocations
        $stmtDept = $pdo->prepare("SELECT * FROM `supply_catalog_departments` WHERE item_id = ? ORDER BY department_name ASC");
        $stmtDept->execute([$id]);
        $departments = $stmtDept->fetchAll(PDO::FETCH_ASSOC);

        return [
            'item' => $item,
            'department_par_stocks' => $departments
        ];
    }

    /**
     * Save Item (Create or Update)
     */
    public function saveItem(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $id = !empty($data['id']) ? (int)$data['id'] : null;
            $name = trim($data['item_name'] ?? '');
            $category = $data['category'] ?? 'medical_surgical';
            $subCat = !empty($data['sub_category']) ? trim($data['sub_category']) : null;
            $brand = !empty($data['brand_manufacturer']) ? trim($data['brand_manufacturer']) : null;
            $uom = trim($data['unit_of_measure'] ?? 'piece');
            $pkg = !empty($data['packaging_description']) ? trim($data['packaging_description']) : null;
            $cost = max(0, (float)($data['standard_cost'] ?? 0));
            $price = max(0, (float)($data['selling_price'] ?? 0));
            $billable = !empty($data['is_billable_to_patient']) ? 1 : 0;
            $minStock = max(0, (float)($data['min_safety_stock'] ?? 20));
            $maxStock = !empty($data['max_stock_level']) ? max(0, (float)$data['max_stock_level']) : 200;
            $stock = max(0, (float)($data['current_stock'] ?? 0));
            $reorder = max(0, (float)($data['reorder_quantity'] ?? 50));
            $storage = !empty($data['storage_requirements']) ? trim($data['storage_requirements']) : 'Store in clean, dry area below 25°C';
            $sterility = $data['sterility_type'] ?? 'sterile';
            $singleUse = !empty($data['is_single_use']) ? 1 : 0;
            $sku = !empty($data['barcode_sku']) ? trim($data['barcode_sku']) : null;
            $suppId = !empty($data['preferred_supplier_id']) ? (int)$data['preferred_supplier_id'] : null;
            $suppName = !empty($data['preferred_supplier_name']) ? trim($data['preferred_supplier_name']) : null;
            $status = $data['status'] ?? 'active';
            $notes = !empty($data['notes']) ? trim($data['notes']) : null;

            if ($id) {
                // Update
                $stmt = $pdo->prepare("
                    UPDATE `supply_catalog_items` SET
                        `item_name` = ?,
                        `category` = ?,
                        `sub_category` = ?,
                        `brand_manufacturer` = ?,
                        `unit_of_measure` = ?,
                        `packaging_description` = ?,
                        `standard_cost` = ?,
                        `selling_price` = ?,
                        `is_billable_to_patient` = ?,
                        `min_safety_stock` = ?,
                        `max_stock_level` = ?,
                        `current_stock` = ?,
                        `reorder_quantity` = ?,
                        `storage_requirements` = ?,
                        `sterility_type` = ?,
                        `is_single_use` = ?,
                        `barcode_sku` = ?,
                        `preferred_supplier_id` = ?,
                        `preferred_supplier_name` = ?,
                        `status` = ?,
                        `notes` = ?,
                        `updated_at` = NOW()
                    WHERE `id` = ?
                ");
                $stmt->execute([
                    $name, $category, $subCat, $brand, $uom, $pkg,
                    $cost, $price, $billable, $minStock, $maxStock,
                    $stock, $reorder, $storage, $sterility, $singleUse,
                    $sku, $suppId, $suppName, $status, $notes,
                    $id
                ]);
                $itemCode = $data['item_code'] ?? "SUP-{$id}";
            } else {
                // Create
                $itemCode = self::generateItemCode($pdo, $category);
                $stmt = $pdo->prepare("
                    INSERT INTO `supply_catalog_items` (
                        `item_code`, `item_name`, `category`, `sub_category`,
                        `brand_manufacturer`, `unit_of_measure`, `packaging_description`,
                        `standard_cost`, `selling_price`, `is_billable_to_patient`,
                        `min_safety_stock`, `max_stock_level`, `current_stock`,
                        `reorder_quantity`, `storage_requirements`, `sterility_type`,
                        `is_single_use`, `barcode_sku`, `preferred_supplier_id`,
                        `preferred_supplier_name`, `status`, `notes`, `created_by`,
                        `created_at`, `updated_at`
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?,
                        NOW(), NOW()
                    )
                ");
                $stmt->execute([
                    $itemCode, $name, $category, $subCat,
                    $brand, $uom, $pkg,
                    $cost, $price, $billable,
                    $minStock, $maxStock, $stock,
                    $reorder, $storage, $sterility,
                    $singleUse, $sku, $suppId,
                    $suppName, $status, $notes, $userId
                ]);
                $id = (int)$pdo->lastInsertId();
            }

            // Save department par allocations if provided
            if (isset($data['department_par_stocks']) && is_array($data['department_par_stocks'])) {
                $stmtDel = $pdo->prepare("DELETE FROM `supply_catalog_departments` WHERE item_id = ?");
                $stmtDel->execute([$id]);

                $stmtDept = $pdo->prepare("
                    INSERT INTO `supply_catalog_departments` (`item_id`, `department_name`, `par_level`, `daily_burn_rate`, `created_at`)
                    VALUES (?, ?, ?, ?, NOW())
                ");
                foreach ($data['department_par_stocks'] as $d) {
                    if (!empty($d['department_name'])) {
                        $stmtDept->execute([
                            $id,
                            trim($d['department_name']),
                            max(0, (float)($d['par_level'] ?? 20)),
                            max(0, (float)($d['daily_burn_rate'] ?? 5))
                        ]);
                    }
                }
            }

            $pdo->commit();

            return [
                'id' => $id,
                'item_code' => $itemCode,
                'message' => "Non-pharmaceutical supply catalog item #{$itemCode} saved successfully."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Adjust Item Current Stock
     */
    public function adjustStock(int $id, float $adjustmentQty, string $reason, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("SELECT current_stock, item_code, item_name FROM supply_catalog_items WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$item) {
                throw new \Exception("Supply catalog item #{$id} not found.");
            }

            $oldStock = (float)$item['current_stock'];
            $newStock = max(0, $oldStock + $adjustmentQty);

            $stmtUp = $pdo->prepare("UPDATE supply_catalog_items SET current_stock = ?, updated_at = NOW() WHERE id = ?");
            $stmtUp->execute([$newStock, $id]);

            $pdo->commit();

            return [
                'id' => $id,
                'item_code' => $item['item_code'],
                'old_stock' => $oldStock,
                'new_stock' => $newStock,
                'adjustment_quantity' => $adjustmentQty,
                'reason' => $reason,
                'message' => "Stock for #{$item['item_code']} adjusted from {$oldStock} to {$newStock} ({$reason})."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Delete Supply Item
     */
    public function deleteItem(int $id): bool
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmtDept = $pdo->prepare("DELETE FROM supply_catalog_departments WHERE item_id = ?");
            $stmtDept->execute([$id]);

            $stmt = $pdo->prepare("DELETE FROM supply_catalog_items WHERE id = ?");
            $stmt->execute([$id]);

            $pdo->commit();
            return true;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * UI Metadata
     */
    public function getMetadata(): array
    {
        $pdo = Database::connection();

        $categories = [
            'medical_surgical' => 'Medical & Surgical Consumables (Syringes, Needles, Infusion Sets)',
            'ppe_infection_control' => 'PPE & Infection Control (Gloves, Masks, Gowns, Caps)',
            'wound_care' => 'Wound Care & Dressings (Gauze, Bandages, Island Dressings)',
            'respiratory_airway' => 'Respiratory & Airway (Endotracheal Tubes, Masks, Suction Catheters)',
            'catheters_tubing' => 'Catheters & Tubing (Foley, Drainage Bags, NG Tubes)',
            'cleaning_disinfectants' => 'Cleaning & Disinfectants (Surface Wipes, Surgical Scrubs)',
            'linen_bedding' => 'Linen & Bedding (Bed Sheets, Blankets, Patient Gowns)',
            'laboratory_disposables' => 'Laboratory Disposables (Vacutainers, Pipettes, Swabs)',
            'radiology_supplies' => 'Radiology & Imaging Supplies (Contrast Line Sets, Lead Accessories)',
            'office_administrative' => 'Administrative & Clinical Station Supplies'
        ];

        $unitsOfMeasure = [
            'piece' => 'Piece (pc)',
            'box' => 'Box',
            'pack' => 'Pack',
            'canister' => 'Canister',
            'bottle' => 'Bottle',
            'roll' => 'Roll',
            'set' => 'Set',
            'carton' => 'Carton'
        ];

        $suppliers = $pdo->query("SELECT id, name, code, supplier_type FROM suppliers WHERE is_active = 1 ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

        $departments = $pdo->query("SELECT id, name FROM departments ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

        return [
            'categories' => $categories,
            'units_of_measure' => $unitsOfMeasure,
            'suppliers' => $suppliers,
            'departments' => $departments
        ];
    }
}
