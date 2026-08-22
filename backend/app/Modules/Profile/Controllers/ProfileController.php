<?php

namespace App\Modules\Profile\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Profile\Services\ProfileService;

class ProfileController extends Controller
{
    private ProfileService $profileService;

    public function __construct()
    {
        $this->profileService = new ProfileService();
    }

    /**
     * Get the logged-in user's own profile.
     */
    public function show(): void
    {
        $user = Session::get('user');

        $profile = $this->profileService->get((int) $user['id'], $user['role']);

        $this->success($profile, 'Profile retrieved successfully.');
    }

    /**
     * Update the logged-in user's own profile.
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'first_name', 'middle_name', 'last_name', 'suffix',
            'email', 'phone',
            'contact_email', 'mobile_phone', 'home_phone', 'work_phone',
            'address_line', 'city', 'province', 'zip_code'
        ]);

        $result = $this->profileService->update((int) $user['id'], $data);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $updatedUser = array_merge($user, [
            'first_name' => $result['data']['first_name'],
            'last_name'  => $result['data']['last_name']
        ]);

        Session::put('user', $updatedUser);

        $this->success(['user' => $updatedUser], $result['message']);
    }

    /**
     * Change the logged-in user's own password.
     */
    public function changePassword(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->profileService->changePassword(
            (int) $user['id'],
            (string) $request->input('current_password', ''),
            (string) $request->input('new_password', '')
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Upload/replace the logged-in user's profile photo.
     */
    public function uploadAvatar(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $files = $request->files();

        $result = $this->profileService->uploadAvatar((int) $user['id'], $files['avatar'] ?? []);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $updatedUser = array_merge($user, [
            'avatar' => $result['data']['avatar']
        ]);

        Session::put('user', $updatedUser);

        $this->success(['user' => $updatedUser], $result['message']);
    }

    /**
     * Remove the logged-in user's profile photo.
     */
    public function removeAvatar(): void
    {
        $user = Session::get('user');

        $result = $this->profileService->removeAvatar((int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $updatedUser = array_merge($user, ['avatar' => null]);

        Session::put('user', $updatedUser);

        $this->success(['user' => $updatedUser], $result['message']);
    }

    /**
     * Save the logged-in patient's signature.
     */
    public function saveSignature(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $data = $request->all();

        if (empty($data['signature'])) {
            $this->error('Signature data is required.', 400);
            return;
        }

        try {
            $this->profileService->saveSignature((int) $user['id'], $data['signature']);
            $this->success([], 'Signature saved successfully.');
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }
}
