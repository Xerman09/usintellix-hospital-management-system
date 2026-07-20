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
            exit;
        }


        if(!in_array($user['role'], $allowedRoles))
        {
            http_response_code(403);

            echo json_encode([
                "message" => "Forbidden"
            ]);

            exit;
        }


        return true;
    }

}