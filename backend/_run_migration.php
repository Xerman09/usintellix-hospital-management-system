<?php
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
    $sql = file_get_contents(__DIR__ . '/database/schema/087_screening_tools.sql');
    $connection->exec($sql);
    echo "Migration 087 executed successfully!";
} catch (PDOException $e) {
    echo "Connection Failed: " . $e->getMessage();
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
