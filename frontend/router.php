<?php

$path = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$file = __DIR__ . $path;

if ($path === '/' || $path === '') {
    $file = __DIR__ . '/index.html';
}

if (!is_file($file)) {
    return false;
}

$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

if ($ext !== 'js' && $ext !== 'html') {
    return false;
}

$content = file_get_contents($file);
$content = preg_replace('/\?v=\d+/', '?v=' . time(), $content);

header('Content-Type: ' . ($ext === 'js' ? 'application/javascript' : 'text/html') . '; charset=utf-8');
echo $content;

return true;
