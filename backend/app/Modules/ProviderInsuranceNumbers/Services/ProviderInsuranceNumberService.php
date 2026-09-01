<?php

namespace App\Modules\ProviderInsuranceNumbers\Services;

use App\Core\Database;
use App\Modules\ProviderInsuranceNumbers\Models\ProviderInsuranceNumber;
use PDO;
use Throwable;

class ProviderInsuranceNumberService
{
    /**
     * Every active provider, left-joined with their billing identifier
     * override row (if any). A provider with no row yet is reported
     * with is_default = true so the UI can show "Default" instead of
     * blank values.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.id AS provider_id, e.first_name, e.last_name,
                    n.provider_number, n.rendering_number, n.group_number
             FROM providers p
             JOIN employees e ON e.id = p.employee_id
             LEFT JOIN provider_insurance_numbers n ON n.provider_id = p.id AND n.deleted_at IS NULL
             WHERE p.deleted_at IS NULL
             ORDER BY e.last_name, e.first_name"
        );
        $stmt->execute();

        return array_map(function (array $row) {
            $isDefault = $row['provider_number'] === null && $row['rendering_number'] === null && $row['group_number'] === null;

            return [
                'provider_id' => (int) $row['provider_id'],
                'name' => trim("{$row['first_name']} {$row['last_name']}"),
                'provider_number' => $row['provider_number'],
                'rendering_number' => $row['rendering_number'],
                'group_number' => $row['group_number'],
                'is_default' => $isDefault
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function update(int $providerId, array $data, int $userId): array
    {
        $provider = Database::connection()->prepare("SELECT id FROM providers WHERE id = ? AND deleted_at IS NULL");
        $provider->execute([$providerId]);

        if (!$provider->fetch()) {
            return ['success' => false, 'message' => 'Provider not found.'];
        }

        $providerNumber = $this->normalize($data['provider_number'] ?? null);
        $renderingNumber = $this->normalize($data['rendering_number'] ?? null);
        $groupNumber = $this->normalize($data['group_number'] ?? null);

        $existing = (new ProviderInsuranceNumber())->where('provider_id', $providerId)->first();

        try {
            if ($existing) {
                if ($providerNumber === null && $renderingNumber === null && $groupNumber === null) {
                    // Clearing every field reverts the provider back to "Default".
                    (new ProviderInsuranceNumber())->update([
                        'deleted_at' => date('Y-m-d H:i:s'),
                        'deleted_by' => $userId
                    ], $existing['id']);
                } else {
                    (new ProviderInsuranceNumber())->update([
                        'provider_number' => $providerNumber,
                        'rendering_number' => $renderingNumber,
                        'group_number' => $groupNumber,
                        'deleted_at' => null,
                        'deleted_by' => null,
                        'updated_at' => date('Y-m-d H:i:s'),
                        'updated_by' => $userId
                    ], $existing['id']);
                }
            } elseif ($providerNumber !== null || $renderingNumber !== null || $groupNumber !== null) {
                (new ProviderInsuranceNumber())->create([
                    'provider_id' => $providerId,
                    'provider_number' => $providerNumber,
                    'rendering_number' => $renderingNumber,
                    'group_number' => $groupNumber,
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);
            }
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to save insurance numbers.'];
        }

        return ['success' => true, 'message' => 'Insurance numbers updated successfully.'];
    }

    private function normalize(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }
}
