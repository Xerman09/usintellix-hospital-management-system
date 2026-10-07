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


        // The route's own list, roles it inherits (charge nurse -> nurse), or a grant
        // for this path in config/role_access.php.
        $current = \App\Core\Router::$current;
        if(!\App\Core\RoleAccess::allows((string) $user['role'], $allowedRoles, $current['method'], $current['path']))
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