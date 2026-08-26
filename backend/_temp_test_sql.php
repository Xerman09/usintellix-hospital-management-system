<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $sql = "SELECT id, name, physical_address_line1 as address, physical_city as city, physical_state as state, physical_zip as zip, physical_country as country FROM facilities WHERE deleted_at IS NULL ORDER BY name ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
