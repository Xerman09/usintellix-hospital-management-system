<?php
// removed
$config = require __DIR__ . '/config/database.php';
$host = $config['host'];
$port = $config['port'];
$database = $config['database'];
$username = $config['username'];
$password = $config['password'];
$charset = $config['charset'];

$dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";

try {
    $connection = new PDO($dsn, $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "Connected successfully!";
} catch (PDOException $e) {
    echo "Connection Failed: " . $e->getMessage();
}
