<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

$sql = "
    SELECT 
        p.id,
        p.patient_no,
        p.first_name,
        p.last_name,
        p.sex,
        p.birthdate,
        p.ethnicity,
        p.created_at,
        TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) as age,
        CONCAT(prov.first_name, ' ', prov.last_name) as provider_name
    FROM patients p
    LEFT JOIN providers prov ON p.provider_id = prov.id
    WHERE p.deleted_at IS NULL
";
$params = [];

$sql .= " ORDER BY p.created_at DESC";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo "Success!";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
