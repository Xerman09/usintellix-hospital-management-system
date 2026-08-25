<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

// Test users table - check if first_name/last_name exist
echo "=== users table columns ===\n";
$stmt = $pdo->query("DESCRIBE users");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "\n=== Test report_history query with join ===\n";
try {
    $sql = "SELECT rh.id, rh.title, rh.report_type, rh.status, rh.created_at AS date, CONCAT(u.first_name, ' ', u.last_name) AS ran_by FROM report_history rh LEFT JOIN users u ON u.id = rh.ran_by WHERE 1=1 ORDER BY rh.created_at DESC";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Query OK. Rows: " . count($rows) . "\n";
    print_r($rows);
} catch (Exception $e) {
    echo "SQL ERROR: " . $e->getMessage() . "\n";
}
