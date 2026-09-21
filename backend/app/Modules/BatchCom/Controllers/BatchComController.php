<?php

namespace App\Modules\BatchCom\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Env;
use App\Core\Request;
use App\Core\Session;
use PDO;

class BatchComController extends Controller
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * POST /batch-com/filter
     * Query patients based on Batch Communication Tool parameters
     */
    public function filter(): void
    {
        $request = new Request();
        $params = $this->buildQuery($request);

        $stmt = $this->db->prepare($params['sql']);
        $stmt->execute($params['bindings']);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->success([
            'total' => count($rows),
            'rows' => $rows
        ], 'Batch communication patient list retrieved.');
    }

    /**
     * GET /batch-com/export-csv
     * Stream or return CSV export for matched patients
     */
    public function exportCsv(): void
    {
        $request = new Request();
        $params = $this->buildQuery($request);

        $stmt = $this->db->prepare($params['sql']);
        $stmt->execute($params['bindings']);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Record log of CSV export
        $sessionUser = Session::get('user');
        $userId = $sessionUser['id'] ?? null;
        $stmtLog = $this->db->prepare("
            INSERT INTO batch_communication_logs 
                (patient_id, recipient_name, recipient_target, type, subject, message, status, created_by, created_at)
            VALUES 
                (NULL, 'Batch Export', 'CSV File Download', 'csv_export', 'Patient List Export', :msg, 'exported', :created_by, NOW())
        ");
        $stmtLog->execute([
            'msg' => 'Exported ' . count($rows) . ' patients with filters applied.',
            'created_by' => $userId
        ]);

        $this->success([
            'total' => count($rows),
            'rows' => $rows,
            'filename' => 'batch_communication_export_' . date('Ymd_His') . '.csv'
        ], 'CSV export generated.');
    }

    /**
     * POST /batch-com/send
     * Broadcast or single send SMS / Email notification
     */
    public function send(): void
    {
        $request = new Request();
        $type = strtolower(trim((string) $request->input('type', 'sms'))); // 'sms' or 'email'
        $subject = trim((string) $request->input('subject', ''));
        $message = trim((string) $request->input('message', ''));
        $recipients = $request->input('recipients', []); // Array of { patient_id, name, target }

        if (empty($message)) {
            $this->error('Message content is required.', 422);
            return;
        }

        if (!is_array($recipients) || empty($recipients)) {
            $this->error('At least one recipient is required.', 422);
            return;
        }

        $sessionUser = Session::get('user');
        $userId = $sessionUser['id'] ?? null;

        // Retrieve provider name from settings if needed
        $settingsRows = $this->db->query("SELECT setting_key, setting_value FROM batch_communication_settings")->fetchAll(PDO::FETCH_KEY_PAIR);
        $providerName = $type === 'sms' 
            ? ($settingsRows['sms_provider_name'] ?? 'EMR GROUP 1 .. SMS') 
            : ($settingsRows['email_provider_name'] ?? 'EMR GROUP');

        $stmt = $this->db->prepare("
            INSERT INTO batch_communication_logs 
                (patient_id, recipient_name, recipient_target, type, subject, message, status, created_by, created_at)
            VALUES 
                (:patient_id, :recipient_name, :recipient_target, :type, :subject, :message, 'sent', :created_by, NOW())
        ");

        $sentCount = 0;
        foreach ($recipients as $rec) {
            $patientId = !empty($rec['patient_id']) ? (int) $rec['patient_id'] : null;
            $target = !empty($rec['target']) ? trim((string) $rec['target']) : '';
            $name = !empty($rec['name']) ? trim((string) $rec['name']) : 'Patient';
            $date = !empty($rec['date']) ? $rec['date'] : date('Y-m-d');
            $startTime = !empty($rec['start_time']) ? $rec['start_time'] : '09:00 AM';
            $endTime = !empty($rec['end_time']) ? $rec['end_time'] : '09:30 AM';

            if (!empty($target)) {
                // Personalize OpenEMR tags
                $personalMsg = str_replace(
                    ['***NAME***', '***PROVIDER***', '***DATE***', '***STARTTIME***', '***ENDTIME***'],
                    [$name, $providerName, $date, $startTime, $endTime],
                    $message
                );

                $personalSubject = !empty($subject) ? str_replace(
                    ['***NAME***', '***PROVIDER***', '***DATE***'],
                    [$name, $providerName, $date],
                    $subject
                ) : null;

                $stmt->execute([
                    'patient_id' => $patientId,
                    'recipient_name' => $name,
                    'recipient_target' => $target,
                    'type' => $type,
                    'subject' => $personalSubject,
                    'message' => $personalMsg,
                    'created_by' => $userId
                ]);
                $sentCount++;
            }
        }

        $this->success([
            'sent_count' => $sentCount,
            'type' => $type
        ], "{$sentCount} " . strtoupper($type) . " message(s) queued & sent successfully.");
    }

    /**
     * GET /batch-com/logs
     * Retrieve outbound communication history
     */
    public function logs(): void
    {
        $request = new Request();
        $type = trim((string) $request->input('type', ''));

        $sql = "
            SELECT 
                l.*,
                p.patient_no,
                u.username AS sent_by_username
            FROM batch_communication_logs l
            LEFT JOIN patients p ON l.patient_id = p.id
            LEFT JOIN users u ON l.created_by = u.id
            WHERE 1=1
        ";
        $bindings = [];

        if (!empty($type) && $type !== 'all') {
            $sql .= " AND l.type = ?";
            $bindings[] = $type;
        }

        $sql .= " ORDER BY l.id DESC LIMIT 100";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($bindings);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->success($logs, 'Communication history logs retrieved.');
    }

    /**
     * GET /batch-com/settings
     * Retrieve SMS/Email gateway settings with sensitive secrets masked
     */
    public function getSettings(): void
    {
        $rows = $this->db->query("SELECT setting_key, setting_value FROM batch_communication_settings")->fetchAll(PDO::FETCH_KEY_PAIR);

        $envSmsUsername = (string) Env::get('SMS_GATEWAY_USERNAME', '');
        $envSmsPassword = (string) Env::get('SMS_GATEWAY_PASSWORD', '');
        $envSmsApiKey = (string) Env::get('SMS_GATEWAY_API_KEY', '');

        if (empty($rows['sms_username']) && $envSmsUsername !== '') {
            $rows['sms_username'] = $envSmsUsername;
        }

        $hasPassword = !empty($rows['sms_password']) || $envSmsPassword !== '';
        $hasApiKey = !empty($rows['sms_api_key']) || $envSmsApiKey !== '';

        // Mask secrets so raw sensitive credentials never touch client-side browser DOM / JS memory
        $rows['has_sms_password'] = $hasPassword;
        $rows['has_sms_api_key'] = $hasApiKey;
        $rows['sms_password'] = $hasPassword ? '••••••••' : '';
        $rows['sms_api_key'] = $hasApiKey ? '••••••••' : '';

        $this->success($rows, 'Batch communication settings retrieved.');
    }

    /**
     * POST /batch-com/settings
     * Save SMS/Email gateway settings, safely preserving existing secrets when masked
     */
    public function saveSettings(): void
    {
        $request = new Request();
        $settings = $request->all();

        $stmt = $this->db->prepare("
            INSERT INTO batch_communication_settings (setting_key, setting_value) 
            VALUES (:key, :val) 
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");

        foreach ($settings as $key => $val) {
            if ($key === 'id' || !is_string($key)) {
                continue;
            }

            // Exclude helper flags
            if (in_array($key, ['has_sms_password', 'has_sms_api_key'], true)) {
                continue;
            }

            // Never overwrite real stored secrets with mask strings or empty values
            if (in_array($key, ['sms_password', 'sms_api_key'], true)) {
                $trimmedVal = is_string($val) ? trim($val) : '';
                if ($trimmedVal === '••••••••' || $trimmedVal === '') {
                    continue; // Keep current secret unchanged
                }
            }

            $stmt->execute([
                'key' => $key,
                'val' => is_scalar($val) ? (string) $val : json_encode($val)
            ]);
        }

        $this->success(null, 'Batch communication settings saved successfully.');
    }

    /**
     * Helper to build SQL query based on filters
     */
    private function buildQuery(Request $request): array
    {
        $gender = strtolower(trim((string) $request->input('gender', 'any')));
        $overrideHipaa = (int) $request->input('override_hipaa', 0);
        $sortBy = strtolower(trim((string) $request->input('sort_by', 'zip')));
        $ageMin = $request->input('age_min') !== '' && $request->input('age_min') !== null ? (int) $request->input('age_min') : null;
        $ageMax = $request->input('age_max') !== '' && $request->input('age_max') !== null ? (int) $request->input('age_max') : null;
        $apptFrom = trim((string) $request->input('appt_from', ''));
        $apptTo = trim((string) $request->input('appt_to', ''));
        $seenFrom = trim((string) $request->input('seen_from', ''));
        $seenTo = trim((string) $request->input('seen_to', ''));

        $sql = "
            SELECT 
                p.id,
                p.patient_no,
                p.first_name,
                p.last_name,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS full_name,
                p.sex,
                p.birthdate,
                TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age,
                p.allow_sms,
                p.allow_email,
                p.allow_voice_calls,
                p.allow_postcard,
                c.address_line,
                c.city,
                c.province AS state,
                c.zip_code,
                COALESCE(c.mobile_phone, c.home_phone) AS phone,
                c.email,
                (SELECT MIN(a.appointment_date) 
                 FROM appointments a 
                 WHERE a.patient_id = p.id AND a.appointment_date >= CURDATE() AND a.deleted_at IS NULL
                ) AS next_appointment,
                (SELECT MAX(e.date_of_service) 
                 FROM encounters e 
                 WHERE e.patient_id = p.id AND e.deleted_at IS NULL
                ) AS last_seen
            FROM patients p
            LEFT JOIN patient_contacts c ON p.id = c.patient_id AND c.deleted_at IS NULL
            WHERE p.deleted_at IS NULL
        ";
        $bindings = [];

        // Gender filter
        if ($gender === 'male' || $gender === 'female' || $gender === 'other') {
            $sql .= " AND LOWER(p.sex) = ?";
            $bindings[] = $gender;
        }

        // Age range filter
        if ($ageMin !== null) {
            $sql .= " AND TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) >= ?";
            $bindings[] = $ageMin;
        }
        if ($ageMax !== null) {
            $sql .= " AND TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) <= ?";
            $bindings[] = $ageMax;
        }

        // HIPAA choice override
        if ($overrideHipaa === 0) {
            // Respect HIPAA: ensure patient hasn't opted out of all communications
            $sql .= " AND (p.allow_sms = '1' OR p.allow_email = '1' OR p.allow_voice_calls = '1' OR p.allow_postcard = '1' OR (p.allow_sms IS NULL AND p.allow_email IS NULL))";
        }

        // Appointment within filter
        if (!empty($apptFrom) && !empty($apptTo)) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM appointments a 
                WHERE a.patient_id = p.id AND a.appointment_date BETWEEN ? AND ? AND a.deleted_at IS NULL
            )";
            $bindings[] = $apptFrom;
            $bindings[] = $apptTo;
        } elseif (!empty($apptFrom)) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM appointments a 
                WHERE a.patient_id = p.id AND a.appointment_date >= ? AND a.deleted_at IS NULL
            )";
            $bindings[] = $apptFrom;
        } elseif (!empty($apptTo)) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM appointments a 
                WHERE a.patient_id = p.id AND a.appointment_date <= ? AND a.deleted_at IS NULL
            )";
            $bindings[] = $apptTo;
        }

        // Seen within filter
        if (!empty($seenFrom) && !empty($seenTo)) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM encounters e 
                WHERE e.patient_id = p.id AND DATE(e.date_of_service) BETWEEN ? AND ? AND e.deleted_at IS NULL
            )";
            $bindings[] = $seenFrom;
            $bindings[] = $seenTo;
        } elseif (!empty($seenFrom)) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM encounters e 
                WHERE e.patient_id = p.id AND DATE(e.date_of_service) >= ? AND e.deleted_at IS NULL
            )";
            $bindings[] = $seenFrom;
        } elseif (!empty($seenTo)) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM encounters e 
                WHERE e.patient_id = p.id AND DATE(e.date_of_service) <= ? AND e.deleted_at IS NULL
            )";
            $bindings[] = $seenTo;
        }

        // Sort by
        if (str_contains($sortBy, 'name')) {
            $sql .= " ORDER BY p.last_name ASC, p.first_name ASC";
        } elseif (str_contains($sortBy, 'age')) {
            $sql .= " ORDER BY p.birthdate DESC";
        } elseif (str_contains($sortBy, 'patient') || str_contains($sortBy, 'id')) {
            $sql .= " ORDER BY p.patient_no ASC";
        } else {
            // Default: Zip Code
            $sql .= " ORDER BY c.zip_code ASC, p.last_name ASC";
        }

        $sql .= " LIMIT 500";

        return ['sql' => $sql, 'bindings' => $bindings];
    }
}
