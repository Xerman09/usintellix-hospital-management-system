<?php

namespace App\Modules\Dashboard\Services;

use App\Core\Database;
use App\Modules\Patients\Services\PatientAccessService;
use App\Modules\Providers\Services\ProviderService;
use PDO;

class DashboardService
{
    private ProviderService $providerService;
    private PatientAccessService $patientAccessService;

    public function __construct()
    {
        $this->providerService = new ProviderService();
        $this->patientAccessService = new PatientAccessService();
    }

    /**
     * Get role-scoped dashboard stats built from real data.
     */
    public function getStats(array $user): array
    {
        return match ($user['role']) {
            'doctor' => $this->getDoctorStats($user),
            'patient' => $this->getPatientStats($user),
            default => $this->getStaffStats(),
        };
    }

    /**
     * Hospital-wide stats for admin/receptionist/nurse/lab/pharmacy/billing.
     */
    private function getStaffStats(): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');

        $patientsTotal = (int) $db->query("SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL")->fetchColumn();
        $staffTotal = (int) $db->query("SELECT COUNT(*) FROM employees WHERE deleted_at IS NULL")->fetchColumn();

        $todayStmt = $db->prepare(
            "SELECT COUNT(*) FROM appointments
             WHERE appointment_date = :today AND status != 'cancelled' AND deleted_at IS NULL"
        );
        $todayStmt->execute(['today' => $today]);
        $appointmentsToday = (int) $todayStmt->fetchColumn();

        $weekStmt = $db->prepare(
            "SELECT COUNT(*) FROM appointments
             WHERE appointment_date BETWEEN :start AND :end AND status != 'cancelled' AND deleted_at IS NULL"
        );
        $weekStmt->execute(['start' => $today, 'end' => date('Y-m-d', strtotime('+6 days'))]);
        $appointmentsThisWeek = (int) $weekStmt->fetchColumn();

        return [
            'role_scope' => 'staff',
            'patients_total' => $patientsTotal,
            'staff_total' => $staffTotal,
            'appointments_today' => $appointmentsToday,
            'appointments_this_week' => $appointmentsThisWeek,
            'recent_appointments' => $this->recentAppointments(),
            'appointment_trend' => $this->appointmentTrend(),
            'appointment_status_breakdown' => $this->appointmentStatusBreakdown()
        ];
    }

    /**
     * Stats scoped to the logged-in doctor's own provider record.
     */
    private function getDoctorStats(array $user): array
    {
        $provider = $this->providerService->findByUserId((int) $user['id']);

        if (!$provider) {
            return [
                'role_scope' => 'doctor',
                'has_provider_record' => false,
                'patients_total' => 0,
                'appointments_today' => 0,
                'appointments_upcoming' => 0,
                'recent_appointments' => []
            ];
        }

        $providerId = (int) $provider['id'];
        $db = Database::connection();
        $today = date('Y-m-d');

        $patientsStmt = $db->prepare(
            "SELECT COUNT(*) FROM patients WHERE provider_id = :pid AND deleted_at IS NULL"
        );
        $patientsStmt->execute(['pid' => $providerId]);
        $patientsTotal = (int) $patientsStmt->fetchColumn();

        $todayStmt = $db->prepare(
            "SELECT COUNT(*) FROM appointments
             WHERE provider_id = :pid AND appointment_date = :today AND status != 'cancelled' AND deleted_at IS NULL"
        );
        $todayStmt->execute(['pid' => $providerId, 'today' => $today]);
        $appointmentsToday = (int) $todayStmt->fetchColumn();

        $upcomingStmt = $db->prepare(
            "SELECT COUNT(*) FROM appointments
             WHERE provider_id = :pid AND appointment_date >= :today AND status = 'scheduled' AND deleted_at IS NULL"
        );
        $upcomingStmt->execute(['pid' => $providerId, 'today' => $today]);
        $appointmentsUpcoming = (int) $upcomingStmt->fetchColumn();

        return [
            'role_scope' => 'doctor',
            'has_provider_record' => true,
            'patients_total' => $patientsTotal,
            'appointments_today' => $appointmentsToday,
            'appointments_upcoming' => $appointmentsUpcoming,
            'recent_appointments' => $this->recentAppointments($providerId),
            'appointment_trend' => $this->appointmentTrend($providerId),
            'appointment_status_breakdown' => $this->appointmentStatusBreakdown($providerId)
        ];
    }

    /**
     * Stats scoped to the logged-in patient's own record.
     */
    private function getPatientStats(array $user): array
    {
        $patient = $this->patientAccessService->resolveEffectivePatient($user);

        if (!$patient) {
            return [
                'role_scope' => 'patient',
                'has_patient_record' => false,
                'appointments_upcoming' => 0,
                'next_appointment' => null,
                'recent_appointments' => []
            ];
        }

        $patientId = (int) $patient['id'];
        $db = Database::connection();
        $today = date('Y-m-d');

        $upcomingStmt = $db->prepare(
            "SELECT COUNT(*) FROM appointments
             WHERE patient_id = :pid AND appointment_date >= :today AND status = 'scheduled' AND deleted_at IS NULL"
        );
        $upcomingStmt->execute(['pid' => $patientId, 'today' => $today]);
        $appointmentsUpcoming = (int) $upcomingStmt->fetchColumn();

        $nextStmt = $db->prepare(
            "SELECT a.appointment_date, a.appointment_time, a.reason, a.status,
                    e.first_name AS provider_first_name, e.last_name AS provider_last_name
             FROM appointments a
             JOIN providers pr ON pr.id = a.provider_id
             JOIN employees e ON e.id = pr.employee_id
             WHERE a.patient_id = :pid AND a.appointment_date >= :today
               AND a.status = 'scheduled' AND a.deleted_at IS NULL
             ORDER BY a.appointment_date ASC, a.appointment_time ASC
             LIMIT 1"
        );
        $nextStmt->execute(['pid' => $patientId, 'today' => $today]);
        $next = $nextStmt->fetch(PDO::FETCH_ASSOC) ?: null;

        $recentStmt = $db->prepare(
            "SELECT a.id, a.appointment_date, a.appointment_time, a.reason, a.status,
                    e.first_name AS provider_first_name, e.last_name AS provider_last_name
             FROM appointments a
             JOIN providers pr ON pr.id = a.provider_id
             JOIN employees e ON e.id = pr.employee_id
             WHERE a.patient_id = :pid AND a.deleted_at IS NULL
             ORDER BY a.appointment_date DESC, a.appointment_time DESC
             LIMIT 5"
        );
        $recentStmt->execute(['pid' => $patientId]);

        return [
            'role_scope' => 'patient',
            'has_patient_record' => true,
            'patient_id' => $patientId,
            'appointments_upcoming' => $appointmentsUpcoming,
            'next_appointment' => $next,
            'recent_appointments' => $recentStmt->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /**
     * Most recent appointments hospital-wide, or scoped to a provider.
     */
    private function recentAppointments(?int $providerId = null): array
    {
        $sql = "SELECT a.id, a.appointment_date, a.appointment_time, a.reason, a.status,
                       p.first_name AS patient_first_name, p.last_name AS patient_last_name,
                       e.first_name AS provider_first_name, e.last_name AS provider_last_name
                FROM appointments a
                JOIN patients p ON p.id = a.patient_id
                JOIN providers pr ON pr.id = a.provider_id
                JOIN employees e ON e.id = pr.employee_id
                WHERE a.deleted_at IS NULL";

        $params = [];

        if ($providerId !== null) {
            $sql .= " AND a.provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        $sql .= " ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 6";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Daily appointment volume for the last 14 days (today inclusive),
     * hospital-wide or scoped to a provider. Every day in the range is
     * present even with zero appointments, so the trend chart never has
     * to guess at a gap.
     */
    private function appointmentTrend(?int $providerId = null): array
    {
        $db = Database::connection();
        $start = date('Y-m-d', strtotime('-13 days'));
        $today = date('Y-m-d');

        $sql = "SELECT appointment_date, COUNT(*) AS cnt
                FROM appointments
                WHERE appointment_date BETWEEN :start AND :end
                  AND status != 'cancelled' AND deleted_at IS NULL";
        $params = ['start' => $start, 'end' => $today];

        if ($providerId !== null) {
            $sql .= " AND provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        $sql .= " GROUP BY appointment_date";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        $counts = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $counts[$row['appointment_date']] = (int) $row['cnt'];
        }

        $trend = [];

        for ($i = 13; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $trend[] = ['date' => $date, 'count' => $counts[$date] ?? 0];
        }

        return $trend;
    }

    /**
     * Appointment counts by status over the last 30 days, hospital-wide or
     * scoped to a provider -- unlike appointmentTrend(), cancellations and
     * no-shows are included since the whole point here is seeing them.
     */
    private function appointmentStatusBreakdown(?int $providerId = null): array
    {
        $db = Database::connection();
        $start = date('Y-m-d', strtotime('-29 days'));
        $today = date('Y-m-d');

        $sql = "SELECT status, COUNT(*) AS cnt
                FROM appointments
                WHERE appointment_date BETWEEN :start AND :end AND deleted_at IS NULL";
        $params = ['start' => $start, 'end' => $today];

        if ($providerId !== null) {
            $sql .= " AND provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        $sql .= " GROUP BY status";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        $counts = ['scheduled' => 0, 'completed' => 0, 'cancelled' => 0, 'no_show' => 0];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (isset($counts[$row['status']])) {
                $counts[$row['status']] = (int) $row['cnt'];
            }
        }

        return $counts;
    }
}
