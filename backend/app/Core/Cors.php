<?php

namespace App\Core;

class Cors
{
    public static function handle(): void
    {
        header("Access-Control-Allow-Origin:  http://localhost:5500");

        header("Access-Control-Allow-Credentials: true");

        header("Access-Control-Allow-Headers: Content-Type");

        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");


        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

            http_response_code(200);

            exit;

        }
    }
}