<?php

use App\Core\Session;

class AuthMiddleware
{

    public function handle()
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


        return true;
    }

}