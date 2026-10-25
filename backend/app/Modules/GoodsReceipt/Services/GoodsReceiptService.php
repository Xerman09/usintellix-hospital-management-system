<?php

namespace App\Modules\GoodsReceipt\Services;

use App\Core\Database;
use PDO;
use Throwable;

class GoodsReceiptService
{
    /**
     * Generate Sequential GRN Number GRN-YYYY-0001
     */
    public static function generateGRNNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('GRN_NUMBER', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'GRN_NUMBER' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("GRN-%d-%04d", $year, $num);
    }

    /**
     * Executive Overview & 3-Way Matching Metrics
     */
    public function getExecutiveMetrics(): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                COUNT(*) as total_grns,
                SUM(accepted_total_amount) as total_accepted_amount,
                SUM(po_total_amount - accepted_total_amount) as total_variance_rejected_amount,
                SUM(CASE WHEN three_way_match_status = 'matched_exact' THEN 1 ELSE 0 END) as exact_matches,
                SUM(CASE WHEN three_way_match_status = 'quantity_variance_flagged' THEN 1 ELSE 0 END) as qty_variances,
                SUM(CASE WHEN three_way_match_status = 'partial_delivery_matched' THEN 1 ELSE 0 END) as partial_deliveries,
                SUM(CASE WHEN three_way_match_status = 'rejected_quality_failure' THEN 1 ELSE 0 END) as quality_rejections,
                SUM(CASE WHEN ap_authorization_status = 'authorized_for_payment' THEN 1 ELSE 0 END) as ap_authorized_count,
                SUM(CASE WHEN ap_authorization_status IN ('payment_hold_variance', 'payment_blocked_rejected', 'partially_authorized') THEN 1 ELSE 0 END) as ap_held_count
            FROM `supply_goods_receipt_notes`
        ";
        $m = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC) ?: [];

        $total = (int)($m['total_grns'] ?? 0);
        $exact = (int)($m['exact_matches'] ?? 0);
        $matchRate = $total > 0 ? round(($exact / $total) * 100, 1) : 100.0;

        // Rejected items total count from items
        $totalRejectedQty = (float)$pdo->query("SELECT SUM(rejected_qty) FROM supply_goods_receipt_items")->fetchColumn();

        return [
            'total_grns' => $total,
            'total_accepted_amount' => round((float)($m['total_accepted_amount'] ?? 0), 2),
            'total_variance_rejected_amount' => round((float)($m['total_variance_rejected_amount'] ?? 0), 2),
            'three_way_match_rate' => $matchRate,
            'match_distribution' => [
                'matched_exact' => $exact,
                'quantity_variance_flagged' => (int)($m['qty_variances'] ?? 0),
                'partial_delivery_matched' => (int)($m['partial_deliveries'] ?? 0),
                'rejected_quality_failure' => (int)($m['quality_rejections'] ?? 0)
            ],
            'ap_authorization_summary' => [
                'authorized' => (int)($m['ap_authorized_count'] ?? 0),
                'held_or_blocked' => (int)($m['ap_held_count'] ?? 0)
            ],
            'total_rejected_units' => $totalRejectedQty
        ];
    }

    /**
     * List Goods Receipt Notes (GRN)
     */
    public function listGRNs(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['supplier_id'])) {
            $where[] = "grn.supplier_id = ?";
            $params[] = (int)$filters['supplier_id'];
        }

        if (!empty($filters['three_way_match_status'])) {
            $where[] = "grn.three_way_match_status = ?";
            $params[] = $filters['three_way_match_status'];
        }

        if (!empty($filters['ap_authorization_status'])) {
            $where[] = "grn.ap_authorization_status = ?";
            $params[] = $filters['ap_authorization_status'];
        }

        if (!empty($filters['package_condition'])) {
            $where[] = "grn.package_condition = ?";
            $params[] = $filters['package_condition'];
        }

        if (!empty($filters['received_date'])) {
            $where[] = "grn.received_date = ?";
            $params[] = $filters['received_date'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(grn.grn_number LIKE ? OR grn.po_number LIKE ? OR grn.delivery_receipt_no LIKE ? OR grn.supplier_name LIKE ? OR grn.inspector_name LIKE ? OR grn.carrier_name LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM `supply_goods_receipt_notes` grn WHERE {$whereClause}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT
                grn.*,
                (SELECT COUNT(*) FROM supply_goods_receipt_items WHERE grn_id = grn.id) as item_lines_count
            FROM `supply_goods_receipt_notes` grn
            WHERE {$whereClause}
            ORDER BY grn.received_date DESC, grn.id DESC
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
     * Get GRN Detail with Quality Inspection Lines
     */
    public function getGRNDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("SELECT * FROM `supply_goods_receipt_notes` WHERE id = ?");
        $stmt->execute([$id]);
        $grn = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$grn) return null;

        $stmtItems = $pdo->prepare("SELECT * FROM `supply_goods_receipt_items` WHERE grn_id = ? ORDER BY line_no ASC");
        $stmtItems->execute([$id]);
        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        return [
            'grn' => $grn,
            'items' => $items
        ];
    }

    /**
     * Save GRN with 3-Way Matching Engine & Stock Auto-Increment
     */
    public function saveGRN(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $id = !empty($data['id']) ? (int)$data['id'] : null;
            $poId = !empty($data['purchase_order_id']) ? (int)$data['purchase_order_id'] : null;
            $poNumber = trim($data['po_number'] ?? '');
            $supplierId = (int)($data['supplier_id'] ?? 0);
            $supplierName = trim($data['supplier_name'] ?? '');

            // Auto-fetch supplier name if missing
            if ($supplierId > 0 && empty($supplierName)) {
                $selSupp = $pdo->prepare("SELECT name FROM suppliers WHERE id = ?");
                $selSupp->execute([$supplierId]);
                $supplierName = $selSupp->fetchColumn() ?: 'Medical Supply Vendor';
            }

            $drNo = trim($data['delivery_receipt_no'] ?? 'DR-' . date('Ymd-His'));
            $carrier = !empty($data['carrier_name']) ? trim($data['carrier_name']) : 'Vendor Direct Truck';
            $plate = !empty($data['vehicle_plate_no']) ? trim($data['vehicle_plate_no']) : null;
            $receivedDate = $data['received_date'] ?? date('Y-m-d');
            $receivingBay = !empty($data['receiving_bay']) ? trim($data['receiving_bay']) : 'Hospital Central Receiving Dock Bay 1';
            $inspectorName = trim($data['inspector_name'] ?? 'Receiving Quality Inspector');
            $inspectorTitle = trim($data['inspector_title'] ?? 'Materials Management Officer');
            $inspectorId = !empty($data['inspector_employee_id']) ? (int)$data['inspector_employee_id'] : null;

            // Package condition & quality checks
            $pkgCondition = $data['package_condition'] ?? 'intact_undamaged';
            $coldChain = !empty($data['cold_chain_verified']) ? 1 : 0;
            $temp = isset($data['temperature_celsius']) && $data['temperature_celsius'] !== '' ? (float)$data['temperature_celsius'] : 22.0;
            $sterility = !empty($data['sterility_seal_inspected']) ? 1 : 0;
            $lotExp = !empty($data['lot_expiry_inspected']) ? 1 : 0;

            $itemsData = $data['items'] ?? [];
            if (empty($itemsData)) {
                throw new \Exception("At least one goods receipt item line must be inspected.");
            }

            // Calculate 3-way matching quantities and totals
            $totalPOQty = 0;
            $totalDRQty = 0;
            $totalAcceptedQty = 0;
            $totalRejectedQty = 0;
            $totalPOAmount = 0;
            $totalAcceptedAmount = 0;
            $hasQualityRejection = false;

            foreach ($itemsData as $it) {
                $poQty = max(0, (float)($it['po_ordered_qty'] ?? 0));
                $delQty = max(0, (float)($it['delivered_qty'] ?? $it['delivery_receipt_qty'] ?? 0));
                $accQty = max(0, (float)($it['accepted_qty'] ?? 0));
                $rejQty = max(0, (float)($it['rejected_qty'] ?? 0));
                $cost = max(0, (float)($it['unit_cost'] ?? $it['po_unit_price'] ?? 0));

                $totalPOQty += $poQty;
                $totalDRQty += $delQty;
                $totalAcceptedQty += $accQty;
                $totalRejectedQty += $rejQty;
                $totalPOAmount += ($poQty * $cost);
                $totalAcceptedAmount += ($accQty * $cost);

                if ($rejQty > 0 || (!empty($it['rejection_reason']) && $it['rejection_reason'] !== 'none')) {
                    $hasQualityRejection = true;
                }
            }

            $varianceAmount = $totalAcceptedAmount - $totalPOAmount;

            // 3-Way Match Status Derivation
            if ($totalAcceptedQty == 0 && $totalRejectedQty > 0) {
                $matchStatus = 'rejected_quality_failure';
                $apStatus = 'payment_blocked_rejected';
            } elseif ($hasQualityRejection) {
                $matchStatus = 'quantity_variance_flagged';
                $apStatus = 'partially_authorized';
            } elseif ($totalAcceptedQty < $totalPOQty) {
                $matchStatus = 'partial_delivery_matched';
                $apStatus = 'authorized_for_payment';
            } elseif (abs($varianceAmount) < 0.01) {
                $matchStatus = 'matched_exact';
                $apStatus = 'authorized_for_payment';
            } else {
                $matchStatus = 'quantity_variance_flagged';
                $apStatus = 'payment_hold_variance';
            }

            $rejectionReason = !empty($data['rejection_reason']) ? trim($data['rejection_reason']) : ($hasQualityRejection ? "Rejected items flagged during physical quality inspection." : null);
            $notes = !empty($data['general_notes']) ? trim($data['general_notes']) : null;
            $authBy = !empty($data['authorized_by']) ? trim($data['authorized_by']) : ($apStatus === 'authorized_for_payment' ? 'Dr. Arthur Sterling, CMO / AP Finance Lead' : null);

            if ($id) {
                // Update GRN
                $stmt = $pdo->prepare("
                    UPDATE `supply_goods_receipt_notes` SET
                        `purchase_order_id` = ?,
                        `po_number` = ?,
                        `supplier_id` = ?,
                        `supplier_name` = ?,
                        `delivery_receipt_no` = ?,
                        `carrier_name` = ?,
                        `vehicle_plate_no` = ?,
                        `received_date` = ?,
                        `receiving_bay` = ?,
                        `inspector_employee_id` = ?,
                        `inspector_name` = ?,
                        `inspector_title` = ?,
                        `package_condition` = ?,
                        `cold_chain_verified` = ?,
                        `temperature_celsius` = ?,
                        `sterility_seal_inspected` = ?,
                        `lot_expiry_inspected` = ?,
                        `po_total_ordered_qty` = ?,
                        `delivery_receipt_qty` = ?,
                        `accepted_qty` = ?,
                        `rejected_qty` = ?,
                        `po_total_amount` = ?,
                        `accepted_total_amount` = ?,
                        `variance_amount` = ?,
                        `three_way_match_status` = ?,
                        `ap_authorization_status` = ?,
                        `authorized_by` = ?,
                        `rejection_reason` = ?,
                        `general_notes` = ?,
                        `updated_at` = NOW()
                    WHERE `id` = ?
                ");
                $stmt->execute([
                    $poId, $poNumber, $supplierId, $supplierName, $drNo,
                    $carrier, $plate, $receivedDate, $receivingBay,
                    $inspectorId, $inspectorName, $inspectorTitle,
                    $pkgCondition, $coldChain, $temp, $sterility, $lotExp,
                    $totalPOQty, $totalDRQty, $totalAcceptedQty, $totalRejectedQty,
                    $totalPOAmount, $totalAcceptedAmount, $varianceAmount,
                    $matchStatus, $apStatus, $authBy, $rejectionReason, $notes,
                    $id
                ]);
                $grnNumber = $data['grn_number'] ?? "GRN-{$id}";
            } else {
                // Create GRN
                $grnNumber = self::generateGRNNumber($pdo);
                $stmt = $pdo->prepare("
                    INSERT INTO `supply_goods_receipt_notes` (
                        `grn_number`, `purchase_order_id`, `po_number`,
                        `supplier_id`, `supplier_name`, `delivery_receipt_no`,
                        `carrier_name`, `vehicle_plate_no`, `received_date`,
                        `receiving_bay`, `inspector_employee_id`, `inspector_name`,
                        `inspector_title`, `package_condition`, `cold_chain_verified`,
                        `temperature_celsius`, `sterility_seal_inspected`, `lot_expiry_inspected`,
                        `po_total_ordered_qty`, `delivery_receipt_qty`, `accepted_qty`,
                        `rejected_qty`, `po_total_amount`, `accepted_total_amount`,
                        `variance_amount`, `three_way_match_status`, `ap_authorization_status`,
                        `authorized_by`, `authorized_at`, `rejection_reason`, `general_notes`,
                        `status`, `created_by`, `created_at`, `updated_at`
                    ) VALUES (
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, NOW(), ?, ?,
                        'authorized', ?, NOW(), NOW()
                    )
                ");
                $stmt->execute([
                    $grnNumber, $poId, $poNumber,
                    $supplierId, $supplierName, $drNo,
                    $carrier, $plate, $receivedDate,
                    $receivingBay, $inspectorId, $inspectorName,
                    $inspectorTitle, $pkgCondition, $coldChain,
                    $temp, $sterility, $lotExp,
                    $totalPOQty, $totalDRQty, $totalAcceptedQty,
                    $totalRejectedQty, $totalPOAmount, $totalAcceptedAmount,
                    $varianceAmount, $matchStatus, $apStatus,
                    $authBy, $rejectionReason, $notes, $userId
                ]);
                $id = (int)$pdo->lastInsertId();
            }

            // Insert / replace line items
            $pdo->prepare("DELETE FROM `supply_goods_receipt_items` WHERE grn_id = ?")->execute([$id]);

            $stmtLine = $pdo->prepare("
                INSERT INTO `supply_goods_receipt_items` (
                    `grn_id`, `line_no`, `supply_item_id`, `drug_id`,
                    `item_code`, `item_name`, `unit_of_measure`,
                    `po_ordered_qty`, `delivered_qty`, `accepted_qty`,
                    `rejected_qty`, `rejection_reason`, `unit_cost`,
                    `line_accepted_amount`, `batch_lot_number`, `expiry_date`,
                    `storage_location`, `inspection_notes`, `created_at`
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, NOW()
                )
            ");

            $lineNo = 1;
            foreach ($itemsData as $it) {
                $supplyItemId = !empty($it['supply_item_id']) ? (int)$it['supply_item_id'] : null;
                $drugId = !empty($it['drug_id']) ? (int)$it['drug_id'] : null;
                $code = trim($it['item_code'] ?? 'SUP-ITEM');
                $name = trim($it['item_name'] ?? $it['item_description'] ?? 'Medical Supply');
                $uom = trim($it['unit_of_measure'] ?? 'box');
                $poQty = max(0, (float)($it['po_ordered_qty'] ?? 0));
                $delQty = max(0, (float)($it['delivered_qty'] ?? $it['delivery_receipt_qty'] ?? 0));
                $accQty = max(0, (float)($it['accepted_qty'] ?? 0));
                $rejQty = max(0, (float)($it['rejected_qty'] ?? 0));
                $rejReason = $it['rejection_reason'] ?? 'none';
                $cost = max(0, (float)($it['unit_cost'] ?? $it['po_unit_price'] ?? 0));
                $lineAccAmount = $accQty * $cost;
                $lot = !empty($it['batch_lot_number']) ? trim($it['batch_lot_number']) : null;
                $exp = !empty($it['expiry_date']) ? $it['expiry_date'] : (!empty($it['expiration_date']) ? $it['expiration_date'] : null);
                $bin = !empty($it['storage_location']) ? trim($it['storage_location']) : (!empty($it['storage_location_bin']) ? trim($it['storage_location_bin']) : 'Central Medical Warehouse Bin A-1');
                $inspNotes = !empty($it['inspection_notes']) ? trim($it['inspection_notes']) : (!empty($it['remarks']) ? trim($it['remarks']) : null);

                $stmtLine->execute([
                    $id, $lineNo++, $supplyItemId, $drugId,
                    $code, $name, $uom,
                    $poQty, $delQty, $accQty,
                    $rejQty, $rejReason, $cost,
                    $lineAccAmount, $lot, $exp,
                    $bin, $inspNotes
                ]);

                // Increment accepted stock in supply_catalog_items if new GRN
                if (empty($data['id']) && $supplyItemId && $accQty > 0) {
                    $stmtStock = $pdo->prepare("UPDATE `supply_catalog_items` SET `current_stock` = `current_stock` + ?, `updated_at` = NOW() WHERE `id` = ?");
                    $stmtStock->execute([$accQty, $supplyItemId]);
                }
            }

            $pdo->commit();

            return [
                'id' => $id,
                'grn_number' => $grnNumber,
                'three_way_match_status' => $matchStatus,
                'ap_authorization_status' => $apStatus,
                'po_total_amount' => $totalPOAmount,
                'accepted_total_amount' => $totalAcceptedAmount,
                'variance_amount' => $varianceAmount,
                'message' => "Goods Receipt Note #{$grnNumber} generated successfully with 3-way match status: {$matchStatus}."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Authorize Accounts Payable Voucher Release
     */
    public function authorizeAP(int $id, string $status, string $authorizedBy, ?string $notes = null): bool
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            UPDATE `supply_goods_receipt_notes`
            SET `ap_authorization_status` = ?,
                `authorized_by` = ?,
                `authorized_at` = NOW(),
                `general_notes` = CONCAT(IFNULL(general_notes, ''), '\n[AP Authorization Update]: ', ?)
            WHERE `id` = ?
        ");
        return $stmt->execute([$status, $authorizedBy, $notes ?? $status, $id]);
    }

    /**
     * Delete GRN
     */
    public function deleteGRN(int $id): bool
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM `supply_goods_receipt_items` WHERE grn_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM `supply_goods_receipt_notes` WHERE id = ?")->execute([$id]);
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

        $suppliers = $pdo->query("SELECT id, name, code, contact_person, phone FROM suppliers WHERE is_active = 1 ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

        $supplyItems = $pdo->query("SELECT id, item_code, item_name, unit_of_measure, standard_cost, current_stock FROM supply_catalog_items WHERE status = 'active' ORDER BY item_name ASC")->fetchAll(PDO::FETCH_ASSOC);

        $packageConditions = [
            'intact_undamaged' => 'Intact & Undamaged (Factory Seals Sealed)',
            'minor_outer_crush' => 'Minor Outer Box Crush (Contents Intact)',
            'severe_damage_open' => 'Severe Damage / Torn Packaging (Rejected)',
            'water_moisture_damage' => 'Water / Moisture Damage (Rejected)',
            'compromised_seals' => 'Compromised / Broken Sterility Seals (Rejected)'
        ];

        $rejectionReasons = [
            'none' => 'None - 100% Quality Acceptance',
            'crushed_packaging' => 'Crushed / Deformed Outer Packaging',
            'broken_sterility_seal' => 'Broken / Breached Sterile Packaging Seal',
            'short_dated_near_expiry' => 'Short-Dated (Less than 12 Months Expiry)',
            'expired_lot' => 'Expired Lot Number on Dock',
            'wrong_item_specification' => 'Incorrect Item Specification / Gauge / Size',
            'temperature_excursion' => 'Cold Chain Temperature Excursion Failure',
            'shortage_missing_quantity' => 'Quantity Shortage from Delivery Receipt',
            'leaking_container' => 'Leaking Bottle / Broken Ampoule'
        ];

        $matchStatuses = [
            'matched_exact' => 'Exact 3-Way Match (100% Match)',
            'partial_delivery_matched' => 'Partial Delivery (Billed for Delivered)',
            'quantity_variance_flagged' => 'Quantity Variance / Debit Memo Required',
            'price_variance_flagged' => 'Price Variance Flagged for AP Audit',
            'rejected_quality_failure' => 'Full Quality Rejection (Payment Blocked)'
        ];

        $apStatuses = [
            'authorized_for_payment' => 'Authorized for Payment (Full Release)',
            'partially_authorized' => 'Partially Authorized (Net of Debit Memo)',
            'payment_hold_variance' => 'Payment On Hold (Variance Audit)',
            'payment_blocked_rejected' => 'Payment Blocked (Total Quality Rejection)'
        ];

        return [
            'suppliers' => $suppliers,
            'supply_items' => $supplyItems,
            'package_conditions' => $packageConditions,
            'rejection_reasons' => $rejectionReasons,
            'match_statuses' => $matchStatuses,
            'ap_statuses' => $apStatuses
        ];
    }
}
