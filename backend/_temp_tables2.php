<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms', 'u815148223_uhms', 'UHMS_intellix2024');
$stmt = $pdo->query('SHOW TABLES');
while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
    echo $row[0] . "\n";
}
