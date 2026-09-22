<?php

namespace App\Modules\NppConsent\Controllers;

use App\Core\AuditLogger;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Models\Patient;
use App\Modules\Users\Models\User;

class NppConsentController extends Controller
{
    /**
     * Get patient NPP acknowledgment status (HIPAA § 164.520).
     * Query: ?patient_id=...
     */
    public function status(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id', 0);

        if ($patientId <= 0) {
            $this->error('Patient ID is required.', 422);
            return;
        }

        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient) {
            $this->error('Patient record not found.', 404);
            return;
        }

        $db = Database::connection();

        // Check latest npp_consent_log entry for this patient
        $stmt = $db->prepare("SELECT * FROM npp_consent_log WHERE patient_id = ? ORDER BY acknowledged_at DESC LIMIT 1");
        $stmt->execute([$patientId]);
        $log = $stmt->fetch();

        // If user account is linked, also check users table
        $user = null;
        if (!empty($patient['user_id'])) {
            $user = (new User())->where('id', (int) $patient['user_id'])->first();
        }

        $isAcknowledged = false;
        $acknowledgedAt = null;
        $signatureType = null;
        $signatureData = null;
        $nppVersion = null;
        $capturedBy = null;

        if ($log) {
            $isAcknowledged = true;
            $acknowledgedAt = $log['acknowledged_at'];
            $signatureType = $log['signature_type'];
            $signatureData = $log['signature_data'];
            $nppVersion = $log['npp_version'];
            $capturedBy = $log['captured_by'];
        } elseif ($user && !empty($user['npp_acknowledged'])) {
            $isAcknowledged = true;
            $acknowledgedAt = $user['npp_acknowledged_at'];
            $signatureType = $user['npp_signature_type'];
            $signatureData = $user['npp_signature_data'];
            $nppVersion = $user['npp_version'];
        }

        $this->success([
            'patient_id'       => $patientId,
            'user_id'          => $patient['user_id'] ?? null,
            'patient_name'     => trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '')),
            'npp_acknowledged' => $isAcknowledged,
            'acknowledged_at'  => $acknowledgedAt,
            'signature_type'   => $signatureType,
            'signature_data'   => $signatureData,
            'npp_version'      => $nppVersion,
            'captured_by'      => $capturedBy
        ], 'Patient NPP status retrieved.');
    }

    /**
     * Record in-clinic or staff-assisted NPP consent acknowledgment (HIPAA § 164.520).
     */
    public function capture(): void
    {
        $staffUser = Session::get('user');
        if (!$staffUser || empty($staffUser['id'])) {
            $this->error('Unauthorized', 401);
            return;
        }

        $request = new Request();
        $patientId = (int) $request->input('patient_id', 0);
        $signatureType = trim((string) $request->input('signature_type', 'in_clinic'));
        $signatureData = trim((string) $request->input('signature_data', ''));
        $nppVersion = trim((string) $request->input('npp_version', '2026-09'));

        if ($patientId <= 0) {
            $this->error('Valid Patient ID is required.', 422);
            return;
        }

        if (empty($signatureData)) {
            $this->error('Patient signature / acknowledgment statement is required.', 422);
            return;
        }

        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient) {
            $this->error('Patient record not found.', 404);
            return;
        }

        $now = date('Y-m-d H:i:s');
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $userId = !empty($patient['user_id']) ? (int) $patient['user_id'] : (int) $staffUser['id'];

        $db = Database::connection();
        $stmt = $db->prepare("INSERT INTO npp_consent_log 
            (user_id, patient_id, acknowledged_at, acknowledged_ip, signature_type, signature_data, npp_version, captured_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId,
            $patientId,
            $now,
            $clientIp,
            $signatureType,
            $signatureData,
            $nppVersion,
            (int) $staffUser['id'],
            $now
        ]);

        // If patient has an active user account, mark it acknowledged as well
        if (!empty($patient['user_id'])) {
            (new User())->where('id', (int) $patient['user_id'])->update([
                'npp_acknowledged'    => 1,
                'npp_acknowledged_at' => $now,
                'npp_acknowledged_ip' => $clientIp,
                'npp_signature_type'  => $signatureType,
                'npp_signature_data'  => $signatureData,
                'npp_version'         => $nppVersion,
            ]);
        }

        // Audit log HIPAA compliance event
        $staffName = trim(($staffUser['first_name'] ?? '') . ' ' . ($staffUser['last_name'] ?? '')) ?: ($staffUser['username'] ?? 'Staff');
        AuditLogger::log(
            AuditLogger::CATEGORY_CONSENT,
            AuditLogger::ACTION_NPP_ACKNOWLEDGED_IN_CLINIC,
            "Notice of Privacy Practices (v{$nppVersion}) acknowledged in-clinic for patient #{$patientId} via '{$signatureType}' (Recorded by staff {$staffName}).",
            $patientId,
            (int) $staffUser['id'],
            $staffUser['role'] ?? 'staff'
        );

        $this->success([
            'patient_id'       => $patientId,
            'npp_acknowledged' => true,
            'acknowledged_at'  => $now,
            'signature_type'   => $signatureType,
            'signature_data'   => $signatureData,
            'npp_version'      => $nppVersion,
            'captured_by'      => (int) $staffUser['id']
        ], 'Patient Notice of Privacy Practices acknowledgment recorded successfully.');
    }
}