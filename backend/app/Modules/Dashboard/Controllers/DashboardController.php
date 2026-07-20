<?php

namespace App\Modules\Dashboard\Controllers;

use App\Core\Controller;
use App\Core\Session;

class DashboardController extends Controller
{
    public function index(): void
    {
        $user = Session::get('user');

        if (!$user) {
            $this->error('Unauthorized.', 401);
            return;
        }

        $this->success([
            'user' => $user
        ], 'Welcome to dashboard.');
    }
}