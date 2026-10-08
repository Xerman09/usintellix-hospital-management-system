<?php

namespace App\Modules\MyWork\Controllers;

use App\Core\Controller;
use App\Core\Session;
use App\Modules\MyWork\Services\MyWorkService;

class MyWorkController extends Controller
{
    /** What is assigned to the signed-in person today (by role). */
    public function index(): void
    {
        $this->success((new MyWorkService())->forUser(Session::get('user') ?? []), 'Retrieved.');
    }
}
