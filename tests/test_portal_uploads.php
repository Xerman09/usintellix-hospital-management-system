<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Modules\MyChart\Services\PortalUploadService;

Env::load();

echo "==================================================\n";
echo "   Automated Verification: Patient Uploads (M11)\n";
echo "==================================================\n";

$pass = 0;
$fail = 0;

function check(string $what, bool $ok, string $detail = ''): void
{
    global $pass, $fail;
    if ($ok) {
        $pass++;
        echo "  [PASS] {$what}\n";
    } else {
        $fail++;
        echo "  [FAIL] {$what}" . ($detail !== '' ? " -- {$detail}" : '') . "\n";
    }
}

$svc = new ReflectionClass(PortalUploadService::class);
$call = static function (string $method, array $args = []) use ($svc) {
    $m = $svc->getMethod($method);
    $m->setAccessible(true);

    return $m->invoke(null, ...$args);
};

// --------------------------------------------------------------------------
// 1. Policy hardening. A nonsense settings row must not block every upload or
//    accept a disk-filling one.
// --------------------------------------------------------------------------
echo "\n-- Settings --\n";

$settings = $call('settings');
check('max_mb is sane', is_int($settings['max_mb']) && $settings['max_mb'] >= 1 && $settings['max_mb'] <= 64, 'got ' . var_export($settings['max_mb'], true));
check('max_per_day is sane', is_int($settings['max_per_day']) && $settings['max_per_day'] >= 1 && $settings['max_per_day'] <= 200);
check('allow_uploads is a boolean', is_bool($settings['allow_uploads']));

// --------------------------------------------------------------------------
// 2. The type allow-list is read from the bytes, not the name.
// --------------------------------------------------------------------------
echo "\n-- Type sniffing --\n";

$tmp = sys_get_temp_dir();
$pngBytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==');

$png = $tmp . '/pu_test_real.png';
file_put_contents($png, $pngBytes);
check('a real PNG sniffs as image/png', $call('sniff', [$png]) === 'image/png', 'got ' . var_export($call('sniff', [$png]), true));

// A script renamed to look like an image is the case that matters.
$fakeImage = $tmp . '/pu_test_fake.png';
file_put_contents($fakeImage, "<?php echo 'pwned'; ?>\n");
$sniffed = $call('sniff', [$fakeImage]);
check('a PHP file named .png does NOT sniff as an image',
    $sniffed !== 'image/png' && $sniffed !== 'image/jpeg', 'got ' . var_export($sniffed, true));

$pdf = $tmp . '/pu_test.pdf';
file_put_contents($pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
check('a PDF sniffs as application/pdf', $call('sniff', [$pdf]) === 'application/pdf', 'got ' . var_export($call('sniff', [$pdf]), true));

// --------------------------------------------------------------------------
// 3. Filenames. These are shown back to the patient and used nowhere else, but
//    a traversal attempt must not survive.
// --------------------------------------------------------------------------
echo "\n-- Filename safety --\n";

foreach ([
    '../../../etc/passwd' => 'passwd',
    'my card.jpg' => 'my card.jpg',
    'C:\\Users\\me\\id.png' => 'id.png',
    '' => 'upload',
    '<script>.png' => '_script_.png',
] as $given => $expected) {
    $got = $call('safeName', [$given]);
    check("safeName(" . var_export($given, true) . ") keeps no path", $got === $expected, 'got ' . var_export($got, true));
}

check('no safeName result contains a separator',
    !array_filter(['../a', 'a/b', 'a\\b'], static fn($n) => str_contains($call('safeName', [$n]), '/') || str_contains($call('safeName', [$n]), '\\')));

// --------------------------------------------------------------------------
// 4. Upload refusals, which all happen before anything is written.
// --------------------------------------------------------------------------
echo "\n-- Upload refusals --\n";

$db = Database::connection();
$patientId = (int) $db->query("SELECT id FROM patients WHERE deleted_at IS NULL ORDER BY id LIMIT 1")->fetchColumn();

if ($patientId <= 0) {
    echo "  [WARN] No patient in this database; upload paths not exercised.\n";
} else {
    $rowsBefore = (int) $db->query("SELECT COUNT(*) FROM patient_uploads")->fetchColumn();
    $filesBefore = count(glob($call('storageDir') . '/pu_*') ?: []);

    $r = PortalUploadService::store($patientId, [], [], null);
    check('no file at all is refused', empty($r['success']));

    $r = PortalUploadService::store($patientId, ['error' => UPLOAD_ERR_INI_SIZE, 'tmp_name' => '', 'size' => 0, 'name' => 'x.jpg'], [], null);
    check('a too-large upload is refused with the size in the message',
        empty($r['success']) && str_contains((string) $r['message'], (string) $settings['max_mb']));

    $r = PortalUploadService::store($patientId, ['error' => UPLOAD_ERR_PARTIAL, 'tmp_name' => '', 'size' => 1, 'name' => 'x.jpg'], [], null);
    check('a partial upload is refused', empty($r['success']));

    // The important one: a path the caller names rather than a real upload. PHP
    // marks only genuinely uploaded files, so this must be rejected even though
    // the file exists and is a valid PNG.
    $r = PortalUploadService::store($patientId, [
        'error' => UPLOAD_ERR_OK,
        'tmp_name' => $png,
        'size' => filesize($png),
        'name' => 'real.png',
    ], [], null);
    check('a file the request merely names is refused (is_uploaded_file)',
        empty($r['success']), 'a non-uploaded path was accepted');

    // A refusal that still wrote a row or left a file on disk would be worse than
    // no validation at all, so this is measured rather than assumed.
    $rowsAfter = (int) $db->query("SELECT COUNT(*) FROM patient_uploads")->fetchColumn();
    $filesAfter = count(glob($call('storageDir') . '/pu_*') ?: []);

    check('no row was inserted by any refusal', $rowsAfter === $rowsBefore, "{$rowsBefore} -> {$rowsAfter}");
    check('no file was left on disk by any refusal', $filesAfter === $filesBefore, "{$filesBefore} -> {$filesAfter}");
}

// --------------------------------------------------------------------------
// 5. The patient's list and its shape.
// --------------------------------------------------------------------------
echo "\n-- The patient's list --\n";

if ($patientId > 0) {
    $mine = PortalUploadService::mine($patientId);

    foreach (['items', 'allowed', 'max_mb', 'remaining_today', 'accepted_types', 'kinds'] as $key) {
        check("mine() returns '{$key}'", array_key_exists($key, $mine));
    }
    check('remaining_today never goes negative', $mine['remaining_today'] >= 0);
    check('the accepted types are images and PDF only',
        $mine['accepted_types'] === ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
        implode(', ', $mine['accepted_types']));
    check('no Office format is accepted',
        !array_filter($mine['accepted_types'], static fn($t) => str_contains($t, 'officedocument') || str_contains($t, 'msword')));
}

// --------------------------------------------------------------------------
// 6. Ownership: another patient's upload is invisible and untouchable.
// --------------------------------------------------------------------------
echo "\n-- Ownership --\n";

$existing = $db->query(
    "SELECT id, patient_id FROM patient_uploads WHERE deleted_at IS NULL ORDER BY id LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

if (!$existing) {
    echo "  [INFO] No uploads in this database yet, so ownership is checked against a made-up id.\n";
    check('pathFor refuses an id that does not exist', PortalUploadService::pathFor($patientId, 999999999) === null);
    check('withdraw refuses an id that does not exist', empty(PortalUploadService::withdraw($patientId, 999999999, null)['success']));
} else {
    $owner = (int) $existing['patient_id'];
    $other = (int) $db->query("SELECT id FROM patients WHERE id <> {$owner} AND deleted_at IS NULL ORDER BY id LIMIT 1")->fetchColumn();
    $uploadId = (int) $existing['id'];

    check('another patient cannot resolve the file path', PortalUploadService::pathFor($other ?: 999999, $uploadId) === null);
    check('another patient cannot withdraw it', empty(PortalUploadService::withdraw($other ?: 999999, $uploadId, null)['success']));
}

// --------------------------------------------------------------------------
// 7. Review decisions.
// --------------------------------------------------------------------------
echo "\n-- Review --\n";

$r = PortalUploadService::review(999999999, ['decision' => 'accept'], 1);
check('reviewing a missing upload is refused', empty($r['success']) && !empty($r['not_found']));

$r = PortalUploadService::review(999999999, ['decision' => 'maybe'], 1);
check('a decision that is neither accept nor reject is refused', empty($r['success']));

// A rejection with no reason is the one the patient cannot act on.
if ($existing && $existing && ($existing['id'] ?? null)) {
    $pending = $db->query("SELECT id FROM patient_uploads WHERE status = 'pending' AND deleted_at IS NULL LIMIT 1")->fetchColumn();
    if ($pending) {
        $r = PortalUploadService::review((int) $pending, ['decision' => 'reject', 'note' => ''], 1);
        check('rejecting without a reason is refused', empty($r['success']) && isset($r['errors']['note']));
    } else {
        echo "  [INFO] No pending upload to test the empty-rejection guard against.\n";
    }
}

$q = PortalUploadService::queue();
check('the queue returns items and counts', array_key_exists('items', $q) && array_key_exists('counts', $q));
check('the counts cover all three states',
    isset($q['counts']['pending'], $q['counts']['accepted'], $q['counts']['rejected']));
// Pending must sort ahead of decided rows, or the queue stops being a queue.
$seenDecided = false;
$orderHolds = true;
foreach ($q['items'] as $item) {
    if ($item['status'] !== 'pending') {
        $seenDecided = true;
    } elseif ($seenDecided) {
        $orderHolds = false;   // a pending row appeared after a decided one
    }
}
check('the queue puts pending ahead of decided', $orderHolds, count($q['items']) . ' item(s)');

// --------------------------------------------------------------------------
// 8. The storage directory must not be readable over HTTP. This is the whole
//    protection for these files, so it is asserted rather than assumed.
// --------------------------------------------------------------------------
echo "\n-- Storage is not web-readable --\n";

$dirMethod = $svc->getMethod('storageDir');
$dirMethod->setAccessible(true);
$dir = $dirMethod->invoke(null);

check('the storage directory exists', is_dir($dir), $dir);
check('it carries an .htaccess denying access', is_file($dir . '/.htaccess'));

if (is_file($dir . '/.htaccess')) {
    $rules = (string) file_get_contents($dir . '/.htaccess');
    check('the .htaccess denies all', str_contains($rules, 'Require all denied') && str_contains($rules, 'Deny from all'));
}

check('uploads are NOT stored under public/', !str_contains(str_replace('\\', '/', $dir), '/public/'), $dir);

@unlink($png);
@unlink($fakeImage);
@unlink($pdf);

echo "\n";
echo "  NOTE: a successful upload is not exercised here -- store() requires a genuine\n";
echo "        PHP file upload (is_uploaded_file), which cannot be faked from the CLI.\n";
echo "        That is the check being relied on, so the refusal above is the test.\n";
echo "        Accept/reject against a real row needs a disposable database.\n";

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
