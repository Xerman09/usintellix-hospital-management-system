<?php

require_once __DIR__ . '/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;

Env::load(__DIR__);

$pdo = Database::connection();

$sql = "CREATE TABLE IF NOT EXISTS encounter_phq9 (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    encounter_id INT(11) NOT NULL,
    patient_id INT(11) NOT NULL,
    author_name VARCHAR(255) NULL,
    q1_little_interest INT(11) NULL,
    q2_feeling_down INT(11) NULL,
    q3_sleep_trouble INT(11) NULL,
    q4_feeling_tired INT(11) NULL,
    q5_poor_appetite INT(11) NULL,
    q6_feeling_bad_self INT(11) NULL,
    q7_trouble_concentrating INT(11) NULL,
    q8_moving_slowly INT(11) NULL,
    q9_better_off_dead INT(11) NULL,
    total_score INT(11) NOT NULL DEFAULT 0,
    severity VARCHAR(100) NOT NULL DEFAULT '',
    created_at DATETIME NULL,
    created_by INT(11) NULL,
    updated_at DATETIME NULL,
    updated_by INT(11) NULL,
    deleted_at DATETIME NULL,
    deleted_by INT(11) NULL
)";

$pdo->exec($sql);
echo "encounter_phq9 table created (or already exists).\n";
