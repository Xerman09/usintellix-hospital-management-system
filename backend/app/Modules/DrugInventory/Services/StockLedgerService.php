<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use PDO;

/**
 * Writes the medicine ledger (drug_stock_movements): one row per change
 * to a lot's stock, recorded in the same transaction as the change.
 *
 * Every place that changes drug_inventory_lots.quantity_on_hand calls
 * record() right after doing it. source_type / source_id name the record
 * behind the movement (a receipt, a transfer lot, an adjustment...) and,
 * with the movement type, are unique -- the same keys the backfill in
 * 234_medicine_ledger.sql uses, so history and new rows never double up.
 */
class StockLedgerService
{
    public const TYPES = [
        'opening' => 'Opening balance',
        'received' => 'Received',
        'receipt_voided' => 'Receipt voided',
        'transfer_in' => 'Transfer in',
        'transfer_out' => 'Transfer out',
        'transfer_cancelled' => 'Transfer cancelled (stock back)',
        'returned' => 'Returned to supplier',
        'destroyed' => 'Destroyed / disposed',
        'adjusted' => 'Stock count adjustment',
        'dispensed' => 'Dispensed'
    ];

    /**
     * $quantity is signed: + into the lot, - out of it (dispensing units).
     * Optional in $details: date (Y-m-d, default today), unit_cost,
     * reference_no, counterparty, reason, notes.
     */
    public static function record(int $lotId, string $type, float $quantity, string $sourceType, int $sourceId, int $userId, array $details = []): void
    {
        if (abs($quantity) < 0.0005) {
            return;
        }

        $db = Database::connection();
        $stmt = $db->prepare("SELECT drug_id, warehouse_id FROM drug_inventory_lots WHERE id = :id");
        $stmt->execute(['id' => $lotId]);
        $lot = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lot) {
            throw new \RuntimeException("ledger: lot {$lotId} not found");
        }

        $cost = $details['unit_cost'] ?? null;
        if ($cost === null || $cost === '') {
            $cost = self::lotCost($lotId, (int) $lot['drug_id']);
        }

        $text = fn(string $key, int $max) => isset($details[$key]) && trim((string) $details[$key]) !== '' ? mb_substr(trim((string) $details[$key]), 0, $max) : null;

        $db->prepare(
            "INSERT INTO drug_stock_movements (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost,
                    reference_no, counterparty, reason, notes, source_type, source_id, created_at, created_by)
             VALUES (:date, :drug, :lot, :warehouse, :type, :qty, :cost, :ref, :party, :reason, :notes, :stype, :sid, :now, :user)"
        )->execute([
            'date' => $details['date'] ?? date('Y-m-d'),
            'drug' => $lot['drug_id'],
            'lot' => $lotId,
            'warehouse' => $lot['warehouse_id'],
            'type' => $type,
            'qty' => round($quantity, 3),
            'cost' => round((float) $cost, 4),
            'ref' => $text('reference_no', 100),
            'party' => $text('counterparty', 255),
            'reason' => $text('reason', 255),
            'notes' => $text('notes', 500),
            'stype' => $sourceType,
            'sid' => $sourceId,
            'now' => date('Y-m-d H:i:s'),
            'user' => $userId ?: null
        ]);
    }

    /** A lot's cost per dispensing unit: its latest delivery, else the catalog cost. */
    public static function lotCost(int $lotId, int $drugId): float
    {
        $stmt = Database::connection()->prepare(
            "SELECT COALESCE((SELECT r.unit_cost FROM drug_inventory_receipts r
                               WHERE r.lot_id = :lot AND r.voided_at IS NULL AND r.unit_cost IS NOT NULL
                               ORDER BY r.received_date DESC, r.id DESC LIMIT 1),
                             (SELECT d.unit_cost FROM drugs d WHERE d.id = :drug), 0)"
        );
        $stmt->execute(['lot' => $lotId, 'drug' => $drugId]);

        return (float) $stmt->fetchColumn();
    }

    public static function warehouseName(int $warehouseId): string
    {
        $stmt = Database::connection()->prepare("SELECT name FROM warehouses WHERE id = :id");
        $stmt->execute(['id' => $warehouseId]);

        return (string) $stmt->fetchColumn();
    }
}
