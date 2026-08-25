<?php
$_SERVER['REQUEST_URI'] = '/reports/patient-list?provider_id=';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['SCRIPT_NAME'] = '/index.php';

// disable Auth middleware for testing
// Actually, it might return 401 Unauthorized, but the frontend says "Unexpected server response (HTTP 200)".
// Let's just run it
require 'public/index.php';
