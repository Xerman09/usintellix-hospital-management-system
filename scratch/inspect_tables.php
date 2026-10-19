<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

$db = Database::connection();
$stmt = $db->query("SELECT id, name, code, type FROM departments");
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$r['id']} | Name: {$r['name']} | Code: {$r['code']} | Type: {$r['type']}" . PHP_EOL;
}
