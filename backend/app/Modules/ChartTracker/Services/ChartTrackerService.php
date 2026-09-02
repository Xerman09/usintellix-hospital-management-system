<?php

namespace App\Modules\ChartTracker\Services;

use App\Core\Database;
use App\Modules\ChartTracker\Models\ChartLocation;
use PDO;

class ChartTrackerService
{
    public const DEFAULT_LOCATION = 'File Room';

    /**
     * Look up a patient by their numeric ID or patient number (e.g.
     * "PAT-000004"), and report where their chart currently is.
     */
    public function lookup(string $identifier): array
    {
        $identifier = trim($identifier);

        if ($identifier === '') {
            return [
                'success' => false,
                'message' => 'Enter a patient ID to look up.'
            ];
        }

        $patient = $this->findPatient($identifier);

        if (!$patient) {
            return [
                'success' => false,
                'message' => "No patient found for ID {$identifier}."
            ];
        }

        $location = $this->currentLocation((int) $patient['id']);

        return [
            'success' => true,
            'data' => [
                'patient_id'       => (int) $patient['id'],
                'patient_no'       => $patient['patient_no'],
                'first_name'       => $patient['first_name'],
                'last_name'        => $patient['last_name'],
                'birthdate'        => $patient['birthdate'],
                'current_location' => $location['destination'] ?? self::DEFAULT_LOCATION,
                'last_moved_at'    => $location['created_at'] ?? null
            ]
        ];
    }

    /**
     * Log a new chart check-in for a patient.
     */
    public function checkIn(int $patientId, string $destination, ?int $userId): array
    {
        $destination = trim($destination);

        if ($destination === '') {
            return [
                'success' => false,
                'message' => 'Enter where the chart is being checked in to.'
            ];
        }

        $patient = (new \App\Modules\Patients\Models\Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Patient not found.'
            ];
        }

        $createdAt = date('Y-m-d H:i:s');

        $id = (new ChartLocation())->create([
            'patient_id'  => $patientId,
            'destination' => $destination,
            'created_at'  => $createdAt,
            'created_by'  => $userId
        ]);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to save the chart location.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Chart location saved.',
            'data' => [
                'current_location' => $destination,
                'last_moved_at'    => $createdAt
            ]
        ];
    }

    /**
     * Find a patient by numeric ID or patient_no.
     */
    private function findPatient(string $identifier): ?array
    {
        $sql = "SELECT id, patient_no, first_name, last_name, birthdate
                FROM patients
                WHERE deleted_at IS NULL AND (patient_no = :identifier";

        $params = ['identifier' => $identifier];

        if (ctype_digit($identifier)) {
            $sql .= " OR id = :id";
            $params['id'] = (int) $identifier;
        }

        $sql .= ") LIMIT 1";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        $patient = $stmt->fetch(PDO::FETCH_ASSOC);

        return $patient ?: null;
    }

    /**
     * The most recent chart_locations row for a patient, if any.
     */
    private function currentLocation(int $patientId): ?array
    {
        $sql = "SELECT destination, created_at FROM chart_locations
                WHERE patient_id = :patient_id
                ORDER BY created_at DESC, id DESC
                LIMIT 1";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute(['patient_id' => $patientId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }
}
