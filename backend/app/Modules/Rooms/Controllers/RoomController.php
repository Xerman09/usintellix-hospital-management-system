<?php

namespace App\Modules\Rooms\Controllers;

use App\Core\Controller;
use App\Modules\Rooms\Services\RoomService;

class RoomController extends Controller
{
    private RoomService $roomService;

    public function __construct()
    {
        $this->roomService = new RoomService();
    }

    /**
     * List rooms.
     */
    public function index(): void
    {
        $rooms = $this->roomService->list();

        $this->success($rooms, 'Rooms retrieved successfully.');
    }
}
