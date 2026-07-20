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

            echo json_encode([
                "message" => "Unauthorized"
            ]);

            exit;
        }


        return true;
    }

}