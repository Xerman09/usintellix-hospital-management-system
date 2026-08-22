<?php
$config = require __DIR__ . '/config/database.php';
$db = new PDO('mysql:host='.$config['host'].';port='.$config['port'].';dbname='.$config['database'].';charset='.$config['charset'], $config['username'], $config['password']);
$res = $db->query('DESCRIBE patients');
print_r($res->fetchAll(PDO::FETCH_ASSOC));
