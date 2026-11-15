<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;
use Throwable;

/**
 * What a planned procedure or admission will cost (Phase M16).
 *
 * A patient can browse the hospital's priced packages, ask the billing desk for
 * a written estimate, and read the estimate they are issued. See schema 339.
 *
 * The honest-estimate rules, all of which are here rather than in the screens,
 * because a screen is the wrong place to decide what a hospital may promise:
 *
 *   An estimate is a snapshot, not a view.  Every figure is copied onto the
 *   estimate when it is issued, along with the currency, the inclusions prose
 *   and a fingerprint of the rows it was priced from. Re-reading an estimate a
 *   year later shows what the patient was told, not what the price list says
 *   today. There is no tariff version in this database to point at instead --
 *   effective_start_date and effective_end_date are NULL on all 17 tariff rows
 *   -- so the snapshot IS the version.
 *
 *   A breakdown is shown only when it adds up.  Of the four packages on file,
 *   one reconciles to its own quoted price; one has no line items at all. A
 *   line-by-line list that disagrees with the total underneath it is worse than
 *   none, so reconcile() checks before anything is copied, and the estimate
 *   records which answer it got.
 *
 *   Nothing is inferred about insurance.  The estimate says whether the hospital
 *   holds cover on file, and nothing about what an insurer will pay, because
 *   that is the insurer's decision and a patient who reads otherwise will plan
 *   around a number nobody promised.
 *
 *   The quoted figure is the one the desk chose.  Every package carries both a
 *   standard and a discounted price and they differ by thousands. Which one
 *   applies is a billing decision, so price_basis is recorded on the estimate
 *   and the catalogue shows both, labelled.
 *
 * Surcharges are deliberately not applied: tariff rows carry emergency, night
 * and holiday percentages, and planned care is priced at the standard rate. The
 * patient is told in words that unplanned or out-of-hours care costs more, which
 * is the usual reason a bill exceeds an estimate.
 */
class PortalCostEstimateService
{
    /** Who may prepare and issue an estimate. Billing and the front desk. */
    public const ISSUE_ROLES = ['admin', 'receptionist'];

    /** Who may read the request queue and the package visibility screen. */
    public const REVIEW_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse'];

    /** Who may change what patients are shown. */
    public const EDIT_ROLES = ['admin'];

    public const PRICE_BASES = ['standard', 'discounted', 'itemised'];

    private const DEFAULT_VALID_DAYS = 30;
    private const DEFAULT_MAX_PENDING = 3;

    /**
     * Said on every estimate, patient-facing. Kept here as one list so the app,
     * the desk screen and any printed copy cannot drift apart on what the
     * hospital is promising.
     */
    public const CAVEATS = [
        'This is an estimate, not a bill. The final amount depends on what care you actually need.',
        'Prices are for planned care during normal hours. Emergency or out-of-hours care costs more.',
        'If you need to stay longer than the package covers, the extra days are charged separately.',
        'Medicines and tests beyond what the package includes are charged separately.',
        'If you have insurance, this figure is the full price. What your insurer pays is their decision.',
    ];

    // ------------------------------------------------------------------
    // The patient
    // ------------------------------------------------------------------

    /**
     * The priced packages a patient may browse.
     *
     * Both prices are returned, labelled, rather than this picking one. The
     * difference is 3,500 on a delivery and 7,000 on gallbladder surgery, and
     * which applies depends on arrangements this service knows nothing about.
     */
    public static function catalogue(): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return [
                'items' => [],
                'money' => self::money(),
                'caveats' => self::CAVEATS,
                'allow_requests' => false,
                'blocked_reason' => 'Prices are not published through the app at the moment. The billing desk can tell you what something will cost.',
            ];
        }

        $sql = "SELECT v.package_id, v.patient_label, v.patient_blurb, v.sequence,
                       p.package_code, p.package_name, p.package_type,
                       p.standard_package_price, p.discounted_price,
                       p.included_bed_days, p.included_room_type,
                       p.inclusions_summary, p.exclusions_summary,
                       p.hmo_covered_flag, p.taxability_flag
                FROM portal_package_visibility v
                JOIN billing_service_packages p ON p.id = v.package_id
                WHERE v.is_patient_visible = 1 AND p.is_active = 1
                ORDER BY v.sequence, v.patient_label";

        $items = [];

        foreach ($db->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $items[] = [
                'package_id' => (int) $row['package_id'],
                'label' => $row['patient_label'],
                'blurb' => $row['patient_blurb'],
                'standard_total' => self::amount($row['standard_package_price']),
                'discounted_total' => self::amount($row['discounted_price']),
                'nights_included' => (int) $row['included_bed_days'],
                'room_included' => $row['included_room_type'],
                'includes_text' => $row['inclusions_summary'],
                'excludes_text' => $row['exclusions_summary'],
                // Said plainly rather than left for the patient to discover when
                // the itemised view turns out to be empty.
                'has_breakdown' => self::reconcile($db, (int) $row['package_id'])['state'] === 'reconciled',
            ];
        }

        return [
            'items' => $items,
            'money' => self::money(),
            'caveats' => self::CAVEATS,
            'allow_requests' => $settings['allow_requests'],
            'blocked_reason' => $settings['allow_requests']
                ? null
                : 'Asking for a written estimate through the app is switched off at the moment. The billing desk can prepare one for you.',
        ];
    }

    /**
     * This patient's own estimates and their outstanding questions.
     *
     * An estimate past its valid_until is still returned, marked expired, rather
     * than hidden: a patient who was quoted a figure should be able to see what
     * they were told and that it has lapsed, which is more use than an empty
     * list.
     */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return [
                'estimates' => [],
                'requests' => [],
                'money' => self::money(),
                'caveats' => self::CAVEATS,
                'allow_requests' => false,
                'blocked_reason' => 'Estimates are not shown in the app at the moment. The billing desk can give you one.',
            ];
        }

        $today = (string) $db->query('SELECT CURDATE()')->fetchColumn();

        $stmt = $db->prepare(
            "SELECT * FROM portal_cost_estimates
              WHERE patient_id = :p AND status = 'issued' AND deleted_at IS NULL
              ORDER BY issued_at DESC, id DESC
              LIMIT 60"
        );
        $stmt->execute(['p' => $patientId]);

        $estimates = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $estimates[] = self::presentEstimate($row, $today, false);
        }

        return [
            'estimates' => $estimates,
            'requests' => self::requestsFor($db, $patientId),
            'money' => self::money(),
            'caveats' => self::CAVEATS,
            'allow_requests' => $settings['allow_requests'],
            'blocked_reason' => null,
            'server_time' => (string) $db->query('SELECT NOW()')->fetchColumn(),
        ];
    }

    /** One estimate in full, with its lines, after proving it is this patient's. */
    public static function show(int $patientId, int $estimateId): ?array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT * FROM portal_cost_estimates
              WHERE id = :i AND patient_id = :p AND status = 'issued' AND deleted_at IS NULL
              LIMIT 1"
        );
        $stmt->execute(['i' => $estimateId, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $today = (string) $db->query('SELECT CURDATE()')->fetchColumn();

        return self::presentEstimate($row, $today, true);
    }

    /**
     * Ask the desk what something will cost.
     *
     * Either a package from the catalogue or free text, because the most common
     * question is about something that has no package -- and a patient who has
     * been told they need "a scope" should be able to ask without first finding
     * it in a price list.
     */
    public static function request(int $patientId, array $input, ?array $user = null): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow'] || !$settings['allow_requests']) {
            return self::fail('Asking through the app is switched off at the moment. The billing desk can prepare an estimate for you.');
        }

        $packageId = isset($input['package_id']) ? (int) $input['package_id'] : 0;
        $askedAbout = trim((string) ($input['asked_about'] ?? ''));
        $note = trim((string) ($input['note'] ?? ''));
        $errors = [];

        if ($packageId > 0 && !self::packageIsVisible($db, $packageId)) {
            // Not "no such package": a patient should not be able to probe which
            // internal package ids exist by watching the error change.
            $errors['package_id'] = 'That is not something we can quote through the app.';
        }

        if ($packageId <= 0 && $askedAbout === '') {
            $errors['asked_about'] = 'Tell us what you would like the cost of.';
        }

        if (mb_strlen($askedAbout) > 255) {
            $errors['asked_about'] = 'Keep it under 255 characters.';
        }

        if (mb_strlen($note) > 500) {
            $errors['note'] = 'Keep it under 500 characters.';
        }

        if ($errors) {
            return self::fail('That could not be sent.', false, $errors);
        }

        $pending = self::pendingCount($db, $patientId);

        if ($pending >= $settings['max_pending']) {
            return self::fail(sprintf(
                'You already have %d question waiting with the billing desk. They will answer those before you send another.',
                $pending
            ));
        }

        $stmt = $db->prepare(
            "INSERT INTO portal_estimate_requests
                (patient_id, package_id, asked_about, note, status, created_at)
             VALUES (:p, :pkg, :about, :note, 'pending', NOW())"
        );
        $stmt->execute([
            'p' => $patientId,
            'pkg' => $packageId > 0 ? $packageId : null,
            'about' => $askedAbout !== '' ? $askedAbout : null,
            'note' => $note !== '' ? $note : null,
        ]);

        $id = (int) $db->lastInsertId();

        PortalAudit::action(
            $user,
            $patientId,
            'Cost Estimate Requested',
            sprintf('Patient asked for an estimate (request #%d)%s.', $id, $packageId > 0 ? " for package #{$packageId}" : '')
        );

        return [
            'success' => true,
            'message' => 'Sent. The billing desk will prepare an estimate and you will see it here.',
            'data' => ['id' => $id],
        ];
    }

    /** Take back a question the desk has not answered yet. */
    public static function withdrawRequest(int $patientId, int $requestId, ?array $user = null): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "UPDATE portal_estimate_requests
                SET deleted_at = NOW(), deleted_by = :by
              WHERE id = :i AND patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute([
            'by' => isset($user['id']) ? (int) $user['id'] : null,
            'i' => $requestId,
            'p' => $patientId,
        ]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That question is not available, or the desk has already answered it.', true);
        }

        PortalAudit::action($user, $patientId, 'Cost Estimate Request Withdrawn', sprintf('Patient withdrew estimate request #%d.', $requestId));

        return ['success' => true, 'message' => 'That question has been taken back.'];
    }

    // ------------------------------------------------------------------
    // The desk
    // ------------------------------------------------------------------

    /** Questions waiting, oldest first. */
    public static function queue(string $status = 'pending', string $q = ''): array
    {
        $db = Database::connection();
        $status = in_array($status, ['pending', 'answered', 'declined', 'all'], true) ? $status : 'pending';

        $where = ['r.deleted_at IS NULL'];
        $params = [];

        if ($status !== 'all') {
            $where[] = 'r.status = :s';
            $params['s'] = $status;
        }

        $q = trim($q);

        if ($q !== '') {
            $where[] = "(p.patient_no LIKE :q OR CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) LIKE :q2 OR r.asked_about LIKE :q3)";
            $params['q'] = "%{$q}%";
            $params['q2'] = "%{$q}%";
            $params['q3'] = "%{$q}%";
        }

        $stmt = $db->prepare(
            "SELECT r.*, p.patient_no,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    v.patient_label, sp.package_code, sp.package_name,
                    e.estimate_no, e.quoted_total,
                    NULLIF(TRIM(CONCAT(COALESCE(re.first_name, ''), ' ', COALESCE(re.last_name, ''))), '') AS reviewed_by_name
             FROM portal_estimate_requests r
             JOIN patients p ON p.id = r.patient_id
             LEFT JOIN billing_service_packages sp ON sp.id = r.package_id
             LEFT JOIN portal_package_visibility v ON v.package_id = r.package_id
             LEFT JOIN portal_cost_estimates e ON e.id = r.estimate_id
             LEFT JOIN employees re ON re.user_id = r.reviewed_by AND re.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY r.status = 'pending' DESC, r.created_at ASC
             LIMIT 300"
        );
        $stmt->execute($params);

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'asked_about' => $r['asked_about'],
            'note' => $r['note'],
            'status' => $r['status'],
            'created_at' => $r['created_at'],
            'package' => $r['package_id'] !== null ? [
                'id' => (int) $r['package_id'],
                'code' => $r['package_code'],
                'staff_name' => $r['package_name'],
                'patient_label' => $r['patient_label'],
            ] : null,
            'estimate' => $r['estimate_id'] !== null ? [
                'id' => (int) $r['estimate_id'],
                'estimate_no' => $r['estimate_no'],
                'quoted_total' => self::amount($r['quoted_total']),
            ] : null,
            'reviewed_at' => $r['reviewed_at'],
            'reviewed_by' => $r['reviewed_by_name'],
            'review_note' => $r['review_note'],
            'patient' => [
                'id' => (int) $r['patient_id'],
                'name' => $r['patient_name'],
                'mrn' => $r['patient_no'],
            ],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'status' => $status,
            'q' => $q,
            'items' => $items,
            'counts' => self::counts($db),
            'money' => self::money(),
        ];
    }

    /**
     * Issue an estimate from a package.
     *
     * This is where the snapshot happens: prices, currency, prose and a
     * fingerprint of the source rows are all copied onto the estimate, so that
     * what the patient was told survives any later edit to the package.
     *
     * $requestId optionally links it to the question it answers.
     */
    public static function issue(array $input, int $actorId): array
    {
        $db = Database::connection();

        $patientId = (int) ($input['patient_id'] ?? 0);
        $packageId = (int) ($input['package_id'] ?? 0);
        $basis = (string) ($input['price_basis'] ?? 'standard');
        $note = trim((string) ($input['note_to_patient'] ?? ''));
        $requestId = isset($input['request_id']) ? (int) $input['request_id'] : 0;
        $errors = [];

        if ($patientId <= 0) {
            $errors['patient_id'] = 'Choose a patient.';
        }

        if (!in_array($basis, ['standard', 'discounted'], true)) {
            $errors['price_basis'] = 'Say which price applies.';
        }

        if (mb_strlen($note) > 2000) {
            $errors['note_to_patient'] = 'Keep the note under 2000 characters.';
        }

        $package = $packageId > 0 ? self::packageRow($db, $packageId) : null;

        if (!$package) {
            $errors['package_id'] = 'Choose a package to price from.';
        }

        if ($patientId > 0 && !self::patientExists($db, $patientId)) {
            $errors['patient_id'] = 'That patient is not on file.';
        }

        if ($errors) {
            return self::fail('That estimate could not be issued.', false, $errors);
        }

        $visibility = self::visibilityRow($db, $packageId);
        $money = self::money();
        $settings = self::settings();

        $standard = (string) $package['standard_package_price'];
        $discounted = (string) $package['discounted_price'];
        $quoted = $basis === 'discounted' ? $discounted : $standard;

        // Tax is honoured rather than assumed. Every package currently has
        // taxability_flag = 0, so this is 0.00 today -- but if that changes, an
        // estimate that silently omitted VAT would understate the bill.
        $taxRate = (int) $package['taxability_flag'] === 1 ? (float) $money['tax_rate_percent'] : 0.0;
        $tax = round(((float) $quoted) * $taxRate / 100, 2);

        $reconciled = self::reconcile($db, $packageId, $basis);
        $fingerprint = self::fingerprint($db, $packageId);
        $insurance = self::insuranceOnFile($db, $patientId);

        $validDays = $settings['valid_days'];
        $validUntil = date('Y-m-d', strtotime("+{$validDays} days"));

        try {
            $db->beginTransaction();

            $estimateNo = self::nextEstimateNo($db);

            $stmt = $db->prepare(
                "INSERT INTO portal_cost_estimates
                    (patient_id, estimate_no, source_type, package_id, title, package_code,
                     price_basis, standard_total, discounted_total, quoted_total,
                     tax_amount, tax_name,
                     currency_code, currency_symbol, currency_position, decimal_places,
                     includes_text, excludes_text, breakdown_state, breakdown_note,
                     source_updated_at, source_fingerprint, priced_at, valid_until,
                     status, note_to_patient, insurance_on_file, hmo_covered,
                     prepared_by, issued_at, created_at)
                 VALUES
                    (:p, :no, 'package', :pkg, :title, :code,
                     :basis, :std, :disc, :quoted,
                     :tax, :taxname,
                     :cc, :cs, :cp, :dp,
                     :inc, :exc, :bstate, :bnote,
                     :supd, :fp, NOW(), :valid,
                     'issued', :note, :ins, :hmo,
                     :by, NOW(), NOW())"
            );
            $stmt->execute([
                'p' => $patientId,
                'no' => $estimateNo,
                'pkg' => $packageId,
                // The patient's words, falling back to the staff name only when
                // nobody has written a patient label for this package.
                'title' => $visibility['patient_label'] ?? $package['package_name'],
                'code' => $package['package_code'],
                'basis' => $basis,
                'std' => $standard,
                'disc' => $discounted,
                'quoted' => $quoted,
                'tax' => number_format($tax, 2, '.', ''),
                'taxname' => $taxRate > 0 ? $money['tax_name'] : null,
                'cc' => $money['currency_code'],
                'cs' => $money['currency_symbol'],
                'cp' => $money['currency_position'],
                'dp' => $money['decimal_places'],
                'inc' => $package['inclusions_summary'],
                'exc' => $package['exclusions_summary'],
                'bstate' => $reconciled['state'],
                'bnote' => $reconciled['note'],
                'supd' => $package['updated_at'],
                'fp' => $fingerprint,
                'valid' => $validUntil,
                'note' => $note !== '' ? $note : null,
                'ins' => $insurance ? 1 : 0,
                'hmo' => (int) $package['hmo_covered_flag'] === 1 ? 1 : 0,
                'by' => $actorId,
            ]);

            $estimateId = (int) $db->lastInsertId();

            // Lines are copied only when they reconcile to the figure being
            // quoted. See the class docblock.
            if ($reconciled['state'] === 'reconciled') {
                $line = $db->prepare(
                    "INSERT INTO portal_cost_estimate_lines
                        (estimate_id, sequence, label, detail, quantity, unit_price, line_total, created_at)
                     VALUES (:e, :seq, :label, :detail, :qty, :unit, :total, NOW())"
                );

                foreach ($reconciled['lines'] as $i => $l) {
                    $line->execute([
                        'e' => $estimateId,
                        'seq' => ($i + 1) * 10,
                        'label' => $l['label'],
                        'detail' => $l['detail'],
                        'qty' => $l['quantity'],
                        'unit' => $l['unit_price'],
                        'total' => $l['line_total'],
                    ]);
                }
            }

            if ($requestId > 0) {
                $db->prepare(
                    "UPDATE portal_estimate_requests
                        SET status = 'answered', estimate_id = :e, reviewed_by = :by, reviewed_at = NOW()
                      WHERE id = :i AND patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
                )->execute(['e' => $estimateId, 'by' => $actorId, 'i' => $requestId, 'p' => $patientId]);
            }

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }

            error_log('estimate issue failed: ' . $e->getMessage());

            return self::fail('The estimate could not be issued.');
        }

        // Telling the patient is the point, but a notification that cannot be
        // queued must not undo an estimate already in their list. No figure goes
        // in the message -- see seed 078.
        try {
            PortalNotificationService::queue($patientId, 'estimate_ready', [
                'what' => (string) ($visibility['patient_label'] ?? $package['package_name']),
                'ref' => $estimateNo,
            ], 'estimate:' . $estimateId);
        } catch (Throwable $e) {
            error_log('estimate notification failed: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'message' => "Issued as {$estimateNo}. The patient can read it in My Chart now.",
            'data' => ['id' => $estimateId, 'estimate_no' => $estimateNo],
        ];
    }

    /**
     * Decline a question without issuing an estimate -- for "we cannot price
     * this until your surgeon has decided what is needed", which is a real and
     * common answer.
     *
     * A reason is required: a declined question the patient cannot act on sends
     * them round the same loop.
     */
    public static function decline(int $requestId, array $input, int $actorId): array
    {
        $db = Database::connection();
        $note = trim((string) ($input['review_note'] ?? $input['note'] ?? ''));

        if ($note === '') {
            return self::fail('Say why, so the patient knows what to do next.', false, [
                'review_note' => 'A reason is required when declining.',
            ]);
        }

        $stmt = $db->prepare(
            "UPDATE portal_estimate_requests
                SET status = 'declined', reviewed_by = :by, reviewed_at = NOW(), review_note = :note
              WHERE id = :i AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute(['by' => $actorId, 'note' => mb_substr($note, 0, 500), 'i' => $requestId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That question is not waiting for an answer.', true);
        }

        return ['success' => true, 'message' => 'Declined. The patient will see your reason.'];
    }

    /**
     * Withdraw an estimate already issued -- because it was wrong, or because
     * the plan changed.
     *
     * The row is kept and marked, not deleted: a patient may have acted on a
     * figure, and "we told you 58,000 on the 4th and withdrew it on the 9th" is
     * a question that has to be answerable.
     */
    public static function withdrawEstimate(int $estimateId, array $input, int $actorId): array
    {
        $db = Database::connection();
        $reason = trim((string) ($input['reason'] ?? ''));

        if ($reason === '') {
            return self::fail('Say why it is being withdrawn.', false, ['reason' => 'A reason is required.']);
        }

        $stmt = $db->prepare(
            "UPDATE portal_cost_estimates
                SET status = 'withdrawn', withdrawn_at = NOW(), withdrawn_by = :by,
                    withdraw_reason = :reason
              WHERE id = :i AND status = 'issued' AND deleted_at IS NULL"
        );
        $stmt->execute(['by' => $actorId, 'reason' => mb_substr($reason, 0, 255), 'i' => $estimateId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That estimate is not one that can be withdrawn.', true);
        }

        return ['success' => true, 'message' => 'Withdrawn. The patient no longer sees it.'];
    }

    /**
     * The packages, as the desk sees them: what patients are shown, and whether
     * each one's itemisation adds up.
     *
     * The reconciliation column is the point of this screen. Three of the four
     * packages cannot show a patient a breakdown, and nobody would know without
     * being told.
     */
    public static function packages(string $q = ''): array
    {
        $db = Database::connection();
        $q = trim($q);

        $where = ['p.is_active = 1'];
        $params = [];

        if ($q !== '') {
            $where[] = '(p.package_name LIKE :q OR p.package_code LIKE :q2 OR v.patient_label LIKE :q3)';
            $params['q'] = "%{$q}%";
            $params['q2'] = "%{$q}%";
            $params['q3'] = "%{$q}%";
        }

        $stmt = $db->prepare(
            "SELECT p.id, p.package_code, p.package_name, p.package_type,
                    p.standard_package_price, p.discounted_price, p.included_bed_days,
                    p.included_room_type, p.inclusions_summary, p.exclusions_summary,
                    p.hmo_covered_flag, p.taxability_flag, p.updated_at,
                    v.id AS visibility_id, v.patient_label, v.patient_blurb,
                    v.is_patient_visible, v.hide_reason, v.sequence
             FROM billing_service_packages p
             LEFT JOIN portal_package_visibility v ON v.package_id = p.id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY COALESCE(v.sequence, 9999), p.package_code"
        );
        $stmt->execute($params);

        $items = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $packageId = (int) $row['id'];
            $standard = self::reconcile($db, $packageId, 'standard');
            $discounted = self::reconcile($db, $packageId, 'discounted');

            $items[] = [
                'package_id' => $packageId,
                'code' => $row['package_code'],
                'staff_name' => $row['package_name'],
                'type' => $row['package_type'],
                'standard_total' => self::amount($row['standard_package_price']),
                'discounted_total' => self::amount($row['discounted_price']),
                'nights_included' => (int) $row['included_bed_days'],
                'room_included' => $row['included_room_type'],
                'includes_text' => $row['inclusions_summary'],
                'excludes_text' => $row['exclusions_summary'],
                'hmo_covered' => (int) $row['hmo_covered_flag'] === 1,
                'taxable' => (int) $row['taxability_flag'] === 1,
                'updated_at' => $row['updated_at'],
                'patient_label' => $row['patient_label'],
                'patient_blurb' => $row['patient_blurb'],
                'is_patient_visible' => $row['visibility_id'] !== null && (int) $row['is_patient_visible'] === 1,
                'hide_reason' => $row['hide_reason'],
                'has_visibility_row' => $row['visibility_id'] !== null,
                'sequence' => $row['sequence'] !== null ? (int) $row['sequence'] : null,
                // Both bases are reported, because a package can reconcile
                // against one price and not the other -- PKG-MAT-001 adds up to
                // its discounted price and is 3,500 short of its standard one.
                'breakdown' => [
                    'standard' => ['state' => $standard['state'], 'note' => $standard['note']],
                    'discounted' => ['state' => $discounted['state'], 'note' => $discounted['note']],
                    'item_count' => $standard['item_count'],
                    'item_total' => self::amount($standard['item_total']),
                ],
                'reaches_patients' => self::reachesPatients($row),
            ];
        }

        return ['items' => $items, 'q' => $q, 'money' => self::money()];
    }

    /** Create or reword the patient-facing entry for a package. */
    public static function saveVisibility(array $data, int $actorId): array
    {
        $db = Database::connection();

        $packageId = (int) ($data['package_id'] ?? 0);
        $label = trim((string) ($data['patient_label'] ?? ''));
        $blurb = trim((string) ($data['patient_blurb'] ?? ''));
        $visible = !empty($data['is_patient_visible']);
        $hideReason = trim((string) ($data['hide_reason'] ?? ''));
        $sequence = (int) ($data['sequence'] ?? 0);
        $errors = [];

        if ($packageId <= 0 || !self::packageRow($db, $packageId)) {
            $errors['package_id'] = 'That package is not on file.';
        }

        if ($label === '') {
            $errors['patient_label'] = 'A patient-facing name is required.';
        }

        if (mb_strlen($label) > 255) {
            $errors['patient_label'] = 'Keep the name under 255 characters.';
        }

        if (mb_strlen($blurb) > 500) {
            $errors['patient_blurb'] = 'Keep the description under 500 characters.';
        }

        if ($errors) {
            return self::fail('That could not be saved.', false, $errors);
        }

        $stmt = $db->prepare(
            "INSERT INTO portal_package_visibility
                (package_id, patient_label, patient_blurb, is_patient_visible, hide_reason, sequence, created_at, updated_by)
             VALUES (:pkg, :label, :blurb, :vis, :hide, :seq, NOW(), :by)
             ON DUPLICATE KEY UPDATE
                patient_label = VALUES(patient_label),
                patient_blurb = VALUES(patient_blurb),
                is_patient_visible = VALUES(is_patient_visible),
                hide_reason = VALUES(hide_reason),
                sequence = VALUES(sequence),
                updated_at = NOW(),
                updated_by = VALUES(updated_by)"
        );
        $stmt->execute([
            'pkg' => $packageId,
            'label' => $label,
            'blurb' => $blurb !== '' ? $blurb : null,
            'vis' => $visible ? 1 : 0,
            'hide' => $hideReason !== '' ? mb_substr($hideReason, 0, 255) : null,
            'seq' => $sequence,
            'by' => $actorId,
        ]);

        return ['success' => true, 'message' => 'Saved.'];
    }

    /** Patients, for the issue form. Mirrors the other desk screens' search. */
    public static function findPatients(string $q): array
    {
        $q = trim($q);

        if (mb_strlen($q) < 2) {
            return [];
        }

        $stmt = Database::connection()->prepare(
            "SELECT id, patient_no,
                    TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name,
                    birthdate
             FROM patients
             WHERE deleted_at IS NULL
               AND (patient_no LIKE :q
                    OR CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) LIKE :q2)
             ORDER BY last_name, first_name
             LIMIT 20"
        );
        $stmt->execute(['q' => "%{$q}%", 'q2' => "%{$q}%"]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'] !== '' ? $r['name'] : 'Unnamed record',
            'mrn' => $r['patient_no'],
            'birthdate' => $r['birthdate'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // Reconciliation -- the decision about whether a breakdown can be shown
    // ------------------------------------------------------------------

    /**
     * Does this package's itemisation add up to the price being quoted?
     *
     * Two candidate line totals exist in billing_package_items and they
     * disagree: covered_amount, and quantity * unit_price. Both are tried
     * against the price basis asked about, and the first that matches to the
     * cent wins. Nothing is scaled, apportioned or rounded into place -- a
     * breakdown that had to be massaged to fit is not a breakdown.
     *
     * Returns state 'reconciled' with lines, 'none' when there are no items at
     * all, or 'unavailable' with a note saying by how much it is out.
     *
     * @return array{state:string, note:?string, lines:array, item_count:int, item_total:string}
     */
    public static function reconcile(PDO $db, int $packageId, string $basis = 'discounted'): array
    {
        $package = self::packageRow($db, $packageId);

        if (!$package) {
            return ['state' => 'none', 'note' => 'That package is not on file.', 'lines' => [], 'item_count' => 0, 'item_total' => '0.00'];
        }

        $stmt = $db->prepare(
            'SELECT item_name, category, quantity, unit_price, covered_amount, is_mandatory, notes
             FROM billing_package_items WHERE package_id = ? ORDER BY id'
        );
        $stmt->execute([$packageId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) {
            return [
                'state' => 'none',
                'note' => 'This package has no itemised list on file, so only the total and the written inclusions can be shown.',
                'lines' => [],
                'item_count' => 0,
                'item_total' => '0.00',
            ];
        }

        $target = $basis === 'standard'
            ? (string) $package['standard_package_price']
            : (string) $package['discounted_price'];

        $sumCovered = '0.00';
        $sumExtended = '0.00';

        foreach ($rows as $r) {
            $sumCovered = bcadd($sumCovered, (string) $r['covered_amount'], 2);
            $sumExtended = bcadd($sumExtended, bcmul((string) $r['quantity'], (string) $r['unit_price'], 2), 2);
        }

        foreach (['covered' => $sumCovered, 'extended' => $sumExtended] as $which => $sum) {
            if (bccomp($sum, $target, 2) !== 0) {
                continue;
            }

            $lines = [];

            foreach ($rows as $r) {
                $lineTotal = $which === 'covered'
                    ? (string) $r['covered_amount']
                    : bcmul((string) $r['quantity'], (string) $r['unit_price'], 2);

                $lines[] = [
                    'label' => $r['item_name'],
                    'detail' => $r['notes'] !== null && $r['notes'] !== '' ? mb_substr((string) $r['notes'], 0, 255) : null,
                    'quantity' => (string) $r['quantity'],
                    // When the covered amounts are what reconcile, the unit price
                    // beside them would not multiply out to the line, so the line
                    // total is shown as its own unit rather than as an arithmetic
                    // claim the patient can check and find wrong.
                    'unit_price' => $which === 'covered' ? $lineTotal : (string) $r['unit_price'],
                    'line_total' => $lineTotal,
                ];
            }

            return [
                'state' => 'reconciled',
                'note' => null,
                'lines' => $lines,
                'item_count' => count($rows),
                'item_total' => $sum,
            ];
        }

        $closest = bccomp(
            self::absDiff($sumCovered, $target),
            self::absDiff($sumExtended, $target),
            2
        ) <= 0 ? $sumCovered : $sumExtended;

        return [
            'state' => 'unavailable',
            'note' => sprintf(
                'The itemised list comes to %s against a %s price of %s, a difference of %s, so no breakdown is shown.',
                $closest,
                $basis,
                $target,
                self::absDiff($closest, $target)
            ),
            'lines' => [],
            'item_count' => count($rows),
            'item_total' => $sumCovered,
        ];
    }

    /**
     * A hash of the prices this estimate was produced from.
     *
     * Stands in for the tariff version that does not exist. Two estimates with
     * the same fingerprint were priced off identical data; a different one means
     * the package or its items have been edited since.
     */
    public static function fingerprint(PDO $db, int $packageId): string
    {
        $package = self::packageRow($db, $packageId);

        if (!$package) {
            return '';
        }

        $parts = [
            'pkg:' . $package['package_code'],
            'std:' . $package['standard_package_price'],
            'disc:' . $package['discounted_price'],
            'beds:' . $package['included_bed_days'],
            'tax:' . $package['taxability_flag'],
        ];

        $stmt = $db->prepare(
            'SELECT item_name, quantity, unit_price, covered_amount
             FROM billing_package_items WHERE package_id = ? ORDER BY id'
        );
        $stmt->execute([$packageId]);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $parts[] = implode('|', [$r['item_name'], $r['quantity'], $r['unit_price'], $r['covered_amount']]);
        }

        return hash('sha256', implode("\n", $parts));
    }

    /**
     * Has this estimate been overtaken by a change to the package it was priced
     * from? Used by the desk, not shown to the patient -- a patient holding a
     * valid estimate should not be told it may be wrong; the desk should reissue.
     */
    public static function isStale(int $estimateId): ?bool
    {
        $db = Database::connection();

        $stmt = $db->prepare('SELECT package_id, source_fingerprint FROM portal_cost_estimates WHERE id = ? LIMIT 1');
        $stmt->execute([$estimateId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || $row['package_id'] === null || $row['source_fingerprint'] === null) {
            return null;
        }

        return self::fingerprint($db, (int) $row['package_id']) !== $row['source_fingerprint'];
    }

    // ------------------------------------------------------------------
    // Presentation
    // ------------------------------------------------------------------

    /**
     * One estimate as the patient reads it.
     *
     * Expiry is computed on read rather than stored, so an estimate does not
     * need a nightly job to become stale and cannot be stale in the database
     * while reading as current.
     */
    private static function presentEstimate(array $row, string $today, bool $withLines): array
    {
        $expired = $row['valid_until'] !== null && (string) $row['valid_until'] < $today;

        $out = [
            'id' => (int) $row['id'],
            'estimate_no' => $row['estimate_no'],
            'title' => $row['title'],
            'quoted_total' => self::amount($row['quoted_total']),
            'quoted_display' => self::formatMoney($row['quoted_total'], $row),
            'price_basis' => $row['price_basis'],
            'tax_amount' => self::amount($row['tax_amount']),
            'tax_name' => $row['tax_name'],
            'nights_note' => null,
            'includes_text' => $row['includes_text'],
            'excludes_text' => $row['excludes_text'],
            'note_to_patient' => $row['note_to_patient'],
            'issued_at' => $row['issued_at'],
            'valid_until' => $row['valid_until'],
            'expired' => $expired,
            'status_text' => $expired
                ? 'This estimate has passed the date it was good until. Ask the billing desk for a current one.'
                : 'This is what we expect this to cost, based on the plan as it stands.',
            'breakdown_state' => $row['breakdown_state'],
            // NOT the stored breakdown_note. That is a diagnostic written for the
            // desk -- "the itemised list comes to 17900.00 against a discounted
            // price of 18000.00, a difference of 100.00" -- and handing it to a
            // patient would tell them the hospital's own figures disagree, in raw
            // unformatted numbers, which is both alarming and useless to them.
            // The desk sees the diagnostic on its own screen and in the row; the
            // patient is told plainly that there is no itemised view for this one.
            'breakdown_note' => match ($row['breakdown_state']) {
                'reconciled' => null,
                default => 'This package is priced as one bundle, so there is no item-by-item list. What it covers is set out above.',
            },
            'insurance_on_file' => (int) $row['insurance_on_file'] === 1,
            'insurance_text' => (int) $row['insurance_on_file'] === 1
                ? 'We have insurance cover recorded for you. This figure is the full price -- what your insurer pays is their decision, not ours.'
                : 'We have no insurance cover recorded for you, so this figure is what you would pay.',
            'caveats' => self::CAVEATS,
            'money' => [
                'currency_code' => $row['currency_code'],
                'currency_symbol' => $row['currency_symbol'],
                'currency_position' => $row['currency_position'],
                'decimal_places' => (int) $row['decimal_places'],
            ],
        ];

        if ($withLines) {
            $out['lines'] = self::linesFor((int) $row['id'], $row);
        }

        return $out;
    }

    private static function linesFor(int $estimateId, array $estimate): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT label, detail, quantity, unit_price, line_total
             FROM portal_cost_estimate_lines WHERE estimate_id = ? ORDER BY sequence, id'
        );
        $stmt->execute([$estimateId]);

        return array_map(static fn(array $r) => [
            'label' => $r['label'],
            'detail' => $r['detail'],
            'quantity' => (string) $r['quantity'],
            'line_total' => self::amount($r['line_total']),
            'line_display' => self::formatMoney($r['line_total'], $estimate),
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Format using the currency snapshotted on the estimate, not the hospital's
     * current setting. An estimate issued in one currency must not re-read as
     * another.
     */
    public static function formatMoney(string|float|int|null $value, array $estimate): string
    {
        $symbol = (string) ($estimate['currency_symbol'] ?? '$');
        $places = (int) ($estimate['decimal_places'] ?? 2);
        $number = number_format((float) $value, max(0, min(4, $places)), '.', ',');

        return ($estimate['currency_position'] ?? 'prefix') === 'suffix'
            ? $number . $symbol
            : $symbol . $number;
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    /**
     * Why a package does or does not reach patients, in a sentence. The same
     * reasoning as M14's items screen: a switch that is off for a reason should
     * say the reason, not leave somebody guessing which flag to flip.
     */
    private static function reachesPatients(array $row): array
    {
        if ($row['visibility_id'] === null) {
            return [
                'reaches' => false,
                'why' => 'No -- nobody has written patient-facing wording for this package yet.',
            ];
        }

        if ((int) $row['is_patient_visible'] !== 1) {
            return [
                'reaches' => false,
                'why' => 'No -- it is switched off for patients'
                    . ($row['hide_reason'] ? ': ' . $row['hide_reason'] : '.'),
            ];
        }

        return ['reaches' => true, 'why' => 'Yes.'];
    }

    /**
     * Deliberately not cached per process.
     *
     * A static cache here would save a handful of queries and break the one
     * thing the fingerprint exists for: isStale() compares a freshly computed
     * fingerprint against a stored one, and a cached package row would have it
     * compare the stored fingerprint against itself and report every estimate as
     * current. A price that has moved must be visible the moment it moves.
     */
    private static function packageRow(PDO $db, int $packageId): ?array
    {
        $stmt = $db->prepare('SELECT * FROM billing_service_packages WHERE id = ? LIMIT 1');
        $stmt->execute([$packageId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    private static function visibilityRow(PDO $db, int $packageId): array
    {
        $stmt = $db->prepare('SELECT * FROM portal_package_visibility WHERE package_id = ? LIMIT 1');
        $stmt->execute([$packageId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private static function packageIsVisible(PDO $db, int $packageId): bool
    {
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM portal_package_visibility v
             JOIN billing_service_packages p ON p.id = v.package_id
             WHERE v.package_id = ? AND v.is_patient_visible = 1 AND p.is_active = 1'
        );
        $stmt->execute([$packageId]);

        return ((int) $stmt->fetchColumn()) > 0;
    }

    private static function patientExists(PDO $db, int $patientId): bool
    {
        $stmt = $db->prepare('SELECT COUNT(*) FROM patients WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$patientId]);

        return ((int) $stmt->fetchColumn()) > 0;
    }

    private static function insuranceOnFile(PDO $db, int $patientId): bool
    {
        try {
            $stmt = $db->prepare('SELECT COUNT(*) FROM patient_insurances WHERE patient_id = ? AND deleted_at IS NULL');
            $stmt->execute([$patientId]);

            return ((int) $stmt->fetchColumn()) > 0;
        } catch (Throwable $e) {
            return false;
        }
    }

    private static function requestsFor(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT r.id, r.asked_about, r.note, r.status, r.created_at, r.review_note,
                    r.reviewed_at, r.estimate_id, v.patient_label, e.estimate_no
             FROM portal_estimate_requests r
             LEFT JOIN portal_package_visibility v ON v.package_id = r.package_id
             LEFT JOIN portal_cost_estimates e ON e.id = r.estimate_id
             WHERE r.patient_id = :p AND r.deleted_at IS NULL
             ORDER BY r.created_at DESC
             LIMIT 30"
        );
        $stmt->execute(['p' => $patientId]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'about' => $r['patient_label'] ?? $r['asked_about'] ?? 'A cost question',
            'note' => $r['note'],
            'status' => $r['status'],
            'created_at' => $r['created_at'],
            'reviewed_at' => $r['reviewed_at'],
            'review_note' => $r['review_note'],
            'estimate_id' => $r['estimate_id'] !== null ? (int) $r['estimate_id'] : null,
            'estimate_no' => $r['estimate_no'],
            'status_text' => match ($r['status']) {
                'pending' => 'The billing desk has this and will come back to you.',
                'answered' => 'Answered -- your estimate is above.',
                'declined' => 'The desk could not put a figure on this yet.',
                default => 'You took this question back.',
            },
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private static function pendingCount(PDO $db, int $patientId): int
    {
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM portal_estimate_requests
              WHERE patient_id = ? AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute([$patientId]);

        return (int) $stmt->fetchColumn();
    }

    private static function counts(PDO $db): array
    {
        $out = ['pending' => 0, 'answered' => 0, 'declined' => 0, 'issued' => 0];

        try {
            $sql = "SELECT status, COUNT(*) c FROM portal_estimate_requests WHERE deleted_at IS NULL GROUP BY status";

            foreach ($db->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $r) {
                if (array_key_exists($r['status'], $out)) {
                    $out[$r['status']] = (int) $r['c'];
                }
            }

            $out['issued'] = (int) $db->query(
                "SELECT COUNT(*) FROM portal_cost_estimates WHERE status = 'issued' AND deleted_at IS NULL"
            )->fetchColumn();
        } catch (Throwable $e) {
            // Counts are decoration on a queue; a failure here must not stop the
            // queue itself being readable.
        }

        return $out;
    }

    /**
     * A human reference, EST-<year>-<sequence>.
     *
     * Derived from the table rather than billing_tariff_counters: that table is
     * the hospital's document numbering, and quietly borrowing a counter_type
     * from it would put portal rows in a sequence the billing office believes it
     * owns. Called inside the issue transaction, and the column is UNIQUE, so a
     * race loses the insert rather than duplicating a reference.
     */
    private static function nextEstimateNo(PDO $db): string
    {
        $year = (int) date('Y');

        $stmt = $db->prepare(
            "SELECT estimate_no FROM portal_cost_estimates
              WHERE estimate_no LIKE :like
              ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['like' => "EST-{$year}-%"]);
        $last = (string) ($stmt->fetchColumn() ?: '');

        $next = 1;

        if ($last !== '' && preg_match('/-(\d+)$/', $last, $m)) {
            $next = ((int) $m[1]) + 1;
        }

        return sprintf('EST-%d-%04d', $year, $next);
    }

    /** Money as a plain decimal string, so JSON carries no float rounding. */
    private static function amount(string|float|int|null $value): string
    {
        return number_format((float) ($value ?? 0), 2, '.', '');
    }

    private static function absDiff(string $a, string $b): string
    {
        $diff = bcsub($a, $b, 2);

        return bccomp($diff, '0', 2) < 0 ? bcmul($diff, '-1', 2) : $diff;
    }

    private static function money(): array
    {
        try {
            $row = Database::connection()->query(
                'SELECT currency_code, currency_symbol, currency_position, decimal_places,
                        tax_name, tax_rate_percent
                 FROM business_settings ORDER BY id LIMIT 1'
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];

        return [
            'currency_code' => (string) ($row['currency_code'] ?? 'USD'),
            'currency_symbol' => (string) ($row['currency_symbol'] ?? '$'),
            'currency_position' => ($row['currency_position'] ?? 'prefix') === 'suffix' ? 'suffix' : 'prefix',
            'decimal_places' => (int) ($row['decimal_places'] ?? 2),
            'tax_name' => (string) ($row['tax_name'] ?? 'Tax'),
            'tax_rate_percent' => (float) ($row['tax_rate_percent'] ?? 0),
        ];
    }

    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                'SELECT portal_allow_cost_estimates, portal_allow_estimate_requests,
                        portal_estimate_valid_days, portal_estimate_max_pending
                 FROM general_settings ORDER BY id LIMIT 1'
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];

        $validDays = (int) ($row['portal_estimate_valid_days'] ?? self::DEFAULT_VALID_DAYS);
        $maxPending = (int) ($row['portal_estimate_max_pending'] ?? self::DEFAULT_MAX_PENDING);

        return [
            'allow' => (int) ($row['portal_allow_cost_estimates'] ?? 1) === 1,
            'allow_requests' => (int) ($row['portal_allow_estimate_requests'] ?? 1) === 1,
            'valid_days' => ($validDays >= 1 && $validDays <= 365) ? $validDays : self::DEFAULT_VALID_DAYS,
            'max_pending' => ($maxPending >= 1 && $maxPending <= 20) ? $maxPending : self::DEFAULT_MAX_PENDING,
        ];
    }

    private static function fail(string $message, bool $notFound = false, ?array $errors = null): array
    {
        $out = ['success' => false, 'message' => $message];

        if ($notFound) {
            $out['not_found'] = true;
        }

        if ($errors) {
            $out['errors'] = $errors;
        }

        return $out;
    }
}
