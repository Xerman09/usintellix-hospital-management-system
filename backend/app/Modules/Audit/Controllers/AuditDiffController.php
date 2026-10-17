<?php

declare(strict_types=1);

namespace App\Modules\Audit\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\AuditDiffService;
use Throwable;

class AuditDiffController extends Controller
{
    /**
     * List granular entity data change diffs with pagination and filters.
     * Route: GET /audit-diffs
     */
    public function index(): void
    {
        $request = new Request();

        $page = max(1, (int) $request->input('page', 1));
        $limit = min(100, max(5, (int) $request->input('limit', 25)));

        $filters = [
            'table_name' => trim((string) $request->input('table_name', '')),
            'record_id'  => (int) $request->input('record_id', 0),
            'action'     => trim((string) $request->input('action', '')),
            'user_id'    => (int) $request->input('user_id', 0),
            'date_from'  => trim((string) $request->input('date_from', '')),
            'date_to'    => trim((string) $request->input('date_to', '')),
            'search'     => trim((string) $request->input('search', '')),
        ];

        try {
            $result = AuditDiffService::getDiffs($filters, $page, $limit);
            $tables = AuditDiffService::getDistinctTables();

            $this->success([
                'diffs'      => $result['data'],
                'pagination' => [
                    'page'        => $result['page'],
                    'limit'       => $result['per_page'],
                    'total'       => $result['total'],
                    'total_pages' => $result['total_pages'],
                ],
                'tables'     => $tables,
            ], 'Entity data diffs retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve audit diffs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Show details of a single diff record.
     * Route: GET /audit-diffs/show?id=123
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id', 0);

        if ($id <= 0) {
            $this->error('Valid diff ID is required.', 422);
            return;
        }

        try {
            $diff = AuditDiffService::getDiffById($id);
            if (!$diff) {
                $this->error('Audit diff record not found.', 404);
                return;
            }

            $this->success($diff, 'Audit diff retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve audit diff: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get distinct table names present in diffs.
     * Route: GET /audit-diffs/tables
     */
    public function tables(): void
    {
        try {
            $tables = AuditDiffService::getDistinctTables();
            $this->success(['tables' => $tables], 'Distinct audited tables retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve tables: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get entity diff history for a specific table and record ID.
     * Route: GET /audit-diffs/entity?table=patients&record_id=101
     */
    public function entityHistory(): void
    {
        $request = new Request();
        $table = trim((string) $request->input('table', ''));
        $recordId = (int) $request->input('record_id', 0);

        if (empty($table) || $recordId <= 0) {
            $this->error('Table name and positive record ID are required.', 422);
            return;
        }

        try {
            $history = AuditDiffService::getEntityHistory($table, $recordId);
            $this->success([
                'table'     => $table,
                'record_id' => $recordId,
                'history'   => $history,
            ], 'Entity audit history retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve entity history: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Record a new diff manually / via service.
     * Route: POST /audit-diffs/record
     */
    public function record(): void
    {
        $request = new Request();
        $table = trim((string) $request->input('table_name', ''));
        $recordId = (int) $request->input('record_id', 0);
        $action = trim((string) $request->input('action', 'UPDATE'));
        $oldValues = $request->input('old_values');
        $newValues = $request->input('new_values');

        if (empty($table) || $recordId <= 0) {
            $this->error('Table name and record ID are required.', 422);
            return;
        }

        if (is_string($oldValues)) {
            $oldValues = json_decode($oldValues, true);
        }
        if (is_string($newValues)) {
            $newValues = json_decode($newValues, true);
        }

        try {
            $id = AuditDiffService::recordDiff(
                $table,
                $recordId,
                $action,
                is_array($oldValues) ? $oldValues : null,
                is_array($newValues) ? $newValues : null
            );

            if ($id === null && $action === 'UPDATE') {
                $this->success(['id' => null, 'message' => 'No fields modified.'], 'No data difference detected.');
                return;
            }

            $this->success(['id' => $id], 'Audit diff recorded successfully.', 201);
        } catch (Throwable $e) {
            $this->error('Failed to record audit diff: ' . $e->getMessage(), 500);
        }
    }
}
