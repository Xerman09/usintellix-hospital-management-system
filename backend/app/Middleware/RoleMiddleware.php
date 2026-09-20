<?php

use App\Core\Session;

class RoleMiddleware
{

    public function handle($allowedRoles)
    {

        $user = Session::get('user');


        if(!$user)
        {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized"
            ]);
            exit;
        }


        if(!in_array($user['role'], $allowedRoles))
        {
            http_response_code(403);
            header('Content-Type: application/json');

            echo json_encode([
                "success" => false,
                "message" => "Forbidden"
            ]);

            exit;
        }


        return true;
    }

}