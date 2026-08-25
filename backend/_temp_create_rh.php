<?php
$pdo = new PDO('mysql:host=195.35.61.75;dbname=u815148223_uhms;charset=utf8mb4', 'u815148223_uhms', 'uHMS_123');

$pdo->exec("
    CREATE TABLE IF NOT EXISTS report_history (
        id INT(11) NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        report_type VARCHAR(100) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Completed',
        ran_by INT(11) NULL,
        filters JSON NULL,
        created_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_created_at (created_at),
        KEY idx_ran_by (ran_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

echo "Table 'report_history' created successfully.\n";
echo "Verifying:\n";
$stmt = $pdo->query('DESCRIBE report_history');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
