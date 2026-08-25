<?php

$uriPath = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
// Strip the base directory path from the URI to get the relative path
$basePath = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
if (strpos($uriPath, $basePath) === 0) {
    $path = substr($uriPath, strlen($basePath));
} else {
    $path = $uriPath;
}

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

// Bust the cache on every load: refresh any existing ?v=N query strings
// (script/link/img tags, already-versioned imports)...
$content = preg_replace('/\?v=\d+/', '?v=' . time(), $content);

// ...and inject one on any relative JS import that never had one, so a
// missed version tag can't silently serve stale cached code forever.
$content = preg_replace_callback(
    '/from(\s+)(["\'])(\.[^"\']*?\.js)\2/',
    function ($matches) {
        return 'from' . $matches[1] . $matches[2] . $matches[3] . '?v=' . time() . $matches[2];
    },
    $content
);

// Dynamically inject APP_URL from backend/.env to affect the frontend
$envPath = __DIR__ . '/../backend/.env';
if (file_exists($envPath)) {
    $envContent = file_get_contents($envPath);
    if (preg_match('/^APP_URL=(.*)$/m', $envContent, $envMatches)) {
        $appUrl = rtrim(trim($envMatches[1]), '/');
        $content = str_replace('https://ihs.dm3system.com', $appUrl, $content);
    }
}

header('Content-Type: ' . ($ext === 'js' ? 'application/javascript' : 'text/html') . '; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
echo $content;

return true;
