<?php

namespace App\Modules\ClinicSchedules\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\ClinicSchedules\Services\ClinicScheduleService;

class ClinicScheduleController extends Controller
{
    private ClinicScheduleService $service;

    public function __construct()
    {
        $this->service = new ClinicScheduleService();
    }

    /**
     * Get overview list of all departments and their operating status.
     */
    public function overview(): void
    {
        $request = new Request();
        $facilityId = $request->input('facility_id') ? (int) $request->input('facility_id') : null;

        $overview = $this->service->getDepartmentsOverview($facilityId);
        $this->success($overview, 'Departments clinic schedule overview retrieved successfully.');
    }

    /**
     * Get 7-day weekly operating schedule for a department.
     */
    public function show(): void
    {
        $request = new Request();
        $departmentId = (int) $request->input('department_id');
        $facilityId = $request->input('facility_id') ? (int) $request->input('facility_id') : null;

        if (!$departmentId) {
            $this->error('Department ID is required.', 422);
            return;
        }

        $result = $this->service->getDepartmentWeeklySchedule($departmentId, $facilityId);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result, 'Clinic weekly schedule retrieved successfully.');
    }

    /**
     * Bulk save or update 7-day weekly schedule for a department.
     */
    public function save(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();

        $departmentId = (int) $request->input('department_id');
        $facilityId = $request->input('facility_id') ? (int) $request->input('facility_id') : null;
        $schedules = $request->input('schedules');

        if (!$departmentId) {
            $this->error('Department ID is required.', 422);
            return;
        }

        if (!is_array($schedules) || empty($schedules)) {
            $this->error('Weekly schedule list is required.', 422);
            return;
        }

        $result = $this->service->bulkSaveWeeklySchedule($departmentId, $schedules, $facilityId, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Copy schedule parameters from one day to other target days.
     */
    public function copyDay(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();

        $departmentId = (int) $request->input('department_id');
        $sourceDay = (string) $request->input('source_day');
        $targetDays = $request->input('target_days');
        $facilityId = $request->input('facility_id') ? (int) $request->input('facility_id') : null;

        if (!$departmentId || empty($sourceDay) || !is_array($targetDays) || empty($targetDays)) {
            $this->error('Department ID, source day, and target days array are required.', 422);
            return;
        }

        $result = $this->service->copyDayToOtherDays($departmentId, $sourceDay, $targetDays, $facilityId, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, 'Schedule copied successfully to selected days.');
    }
}
