<?php

namespace App\Modules\AclGroups\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\AclGroups\Services\AclGroupService;

class AclGroupController extends Controller
{
    private AclGroupService $service;

    public function __construct()
    {
        $this->service = new AclGroupService();
    }

    /**
     * All users + all ACL groups, for the initial page load
     * (admin-only).
     */
    public function overview(): void
    {
        $this->success($this->service->overview(), 'ACL data retrieved successfully.');
    }

    /**
     * A single user's Active/Inactive group memberships (admin-only).
     */
    public function memberships(): void
    {
        $request = new Request();
        $userId = (int) $request->input('user_id', 0);

        if ($userId <= 0) {
            $this->error('A user_id is required.', 422);
            return;
        }

        $this->success($this->service->membershipsForUser($userId), 'Memberships retrieved successfully.');
    }

    /**
     * Add the user to one or more groups (admin-only).
     */
    public function addMembership(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $result = $this->service->addMembership(
            (int) $request->input('user_id', 0),
            (array) $request->input('group_ids', []),
            (int) $admin['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove the user from one or more groups (admin-only).
     */
    public function removeMembership(): void
    {
        $request = new Request();

        $result = $this->service->removeMembership(
            (int) $request->input('user_id', 0),
            (array) $request->input('group_ids', [])
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }
}
