<?php

namespace App\Core;

class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        if ($origin !== '*') {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            header("Access-Control-Allow-Origin: *");
        }

        header("Access-Control-Allow-Credentials: true");

        header("Access-Control-Allow-Headers: Content-Type");

        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");


        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

            http_response_code(200);

            exit;

        }
    }
}