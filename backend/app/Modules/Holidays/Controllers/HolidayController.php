<?php

namespace App\Modules\Holidays\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Holidays\Services\HolidayService;

class HolidayController extends Controller
{
    private HolidayService $holidayService;

    public function __construct()
    {
        $this->holidayService = new HolidayService();
    }

    public function index(): void
    {
        $holidays = $this->holidayService->list();
        $this->success($holidays, 'Holidays retrieved successfully.');
    }

    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();
        $data = $request->only(['name', 'holiday_date', 'recurs_yearly', 'description']);

        $result = $this->holidayService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'holiday_date', 'recurs_yearly', 'description']);

        $result = $this->holidayService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Holiday not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $result = $this->holidayService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
