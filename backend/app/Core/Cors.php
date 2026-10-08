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

        // X-Display-Key: the TV displays' device key (module 9).
        header("Access-Control-Allow-Headers: Content-Type, X-Display-Key");

        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

        // HIPAA Technical Safeguards: Security Headers (§ 164.312(e)(1))
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: SAMEORIGIN");
        header("X-XSS-Protection: 1; mode=block");
        header("Referrer-Policy: strict-origin-when-cross-origin");
        header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
        header("Pragma: no-cache");


        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

            http_response_code(200);

            exit;

        }
    }
}