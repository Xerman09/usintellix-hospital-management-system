<?php

$view = file_get_contents(__DIR__ . '/../frontend/src/modules/dashboard/dashboard.view.js');
preg_match_all('/data-tab=["\']([^"\']+)["\']/', $view, $matches);
$viewTabs = array_unique($matches[1]);

$dash = file_get_contents(__DIR__ . '/../frontend/src/modules/dashboard/dashboard.js');
preg_match_all('/tabId === ["\']([^"\']+)["\']/', $dash, $dashMatches);
$handledTabs = array_unique($dashMatches[1]);

$unhandled = array_diff($viewTabs, $handledTabs);
sort($unhandled);
echo "Total view tabs in navbar: " . count($viewTabs) . "\n";
echo "Handled tabs in dashboard.js: " . count($handledTabs) . "\n";
echo "Unhandled (Stubbed / Placeholder) tabs count: " . count($unhandled) . "\n\n";

foreach ($unhandled as $idx => $u) {
    echo ($idx + 1) . ". " . $u . "\n";
}
