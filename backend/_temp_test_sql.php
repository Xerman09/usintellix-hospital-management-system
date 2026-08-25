<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $sql = "
            SELECT 
                COALESCE(u.last_name, u.first_name, u.username) as provider,
                TIME_FORMAT(a.appointment_time, '%H:%i') as time,
                CONCAT(p.first_name, ' ', p.last_name) as patient,
                a.id as id,
                '333-444-2222' as home, 
                '222-444-2222' as cell, 
                'Established Patient' as type,
                CONCAT('@ ', a.status) as status
            FROM appointments a
            LEFT JOIN users u ON a.provider_id = u.id
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE a.deleted_at IS NULL
        ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    echo 'SUCCESS';
} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage();
}
