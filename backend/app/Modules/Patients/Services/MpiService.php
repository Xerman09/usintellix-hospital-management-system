<?php

declare(strict_types=1);

namespace App\Modules\Patients\Services;

use App\Core\Database;
use App\Core\FieldEncryption;
use PDO;

class MpiService
{
    /**
     * Thresholds for Master Patient Index duplicate detection.
     */
    public const THRESHOLD_CERTAIN  = 90; // High probability duplicate / immediate block
    public const THRESHOLD_PROBABLE = 75; // Probable match / strong caution
    public const THRESHOLD_POSSIBLE = 60; // Possible match / cautionary review

    /**
     * Search the Master Patient Index for potential duplicates against a candidate patient payload.
     *
     * @param array $candidate Demographics of the candidate (first_name, last_name, birthdate, national_id, etc.)
     * @param int|null $excludePatientId Exclude a specific patient ID (e.g., during updates)
     * @param int $minScore Minimum composite score to include in results (default 60)
     * @return array List of matched candidate duplicates sorted descending by score
     */
    public function findDuplicates(array $candidate, ?int $excludePatientId = null, int $minScore = self::THRESHOLD_POSSIBLE): array
    {
        $candidateFirst = $this->normalizeText($candidate['first_name'] ?? '');
        $candidateLast = $this->normalizeText($candidate['last_name'] ?? '');
        $candidateDob = !empty($candidate['birthdate']) ? trim((string)$candidate['birthdate']) : null;
        $candidateNatId = $this->cleanIdNumber($candidate['national_id'] ?? ($candidate['id_document_number'] ?? null));

        // If no substantial demographics were supplied, return early
        if (empty($candidateFirst) && empty($candidateLast) && empty($candidateDob) && empty($candidateNatId)) {
            return [];
        }

        $db = Database::connection();
        $sql = "
            SELECT p.id, p.user_id, p.patient_no, p.first_name, p.middle_name, p.last_name, p.suffix,
                   p.sex, p.birthdate, p.national_id, p.ssn, p.identity_status, p.id_document_type,
                   p.id_document_number, p.created_at,
                   pr.id AS provider_id,
                   pe.first_name AS provider_first_name, pe.last_name AS provider_last_name,
                   pc.address_line, pc.city, pc.province, pc.mobile_phone, pc.home_phone, pc.email
            FROM patients p
            LEFT JOIN providers pr ON pr.id = p.provider_id
            LEFT JOIN employees pe ON pe.id = pr.employee_id
            LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
            WHERE p.deleted_at IS NULL
        ";

        if ($excludePatientId !== null && $excludePatientId > 0) {
            $sql .= " AND p.id <> " . (int)$excludePatientId;
        }

        $rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

        // Decrypt sensitive fields for comparison
        $rows = FieldEncryption::decryptRows($rows, ['ssn', 'national_id', 'id_document_number']);

        $matches = [];

        foreach ($rows as $row) {
            $matchResult = $this->scoreMatch($candidate, $row);

            if ($matchResult['score'] >= $minScore) {
                $fullName = implode(' ', array_filter([$row['first_name'], $row['middle_name'], $row['last_name'], $row['suffix']]));
                $providerName = implode(' ', array_filter([$row['provider_first_name'], $row['provider_last_name']]));
                $phone = $row['mobile_phone'] ?: ($row['home_phone'] ?: null);

                $matches[] = [
                    'id'               => (int)$row['id'],
                    'patient_no'       => $row['patient_no'],
                    'name'             => $fullName,
                    'first_name'       => $row['first_name'],
                    'last_name'        => $row['last_name'],
                    'birthdate'        => $row['birthdate'],
                    'sex'              => $row['sex'],
                    'national_id'      => $row['national_id'] ? $this->maskId($row['national_id']) : null,
                    'identity_status'  => $row['identity_status'] ?? 'Unverified',
                    'id_document_type' => $row['id_document_type'],
                    'id_document_number' => $row['id_document_number'] ? $this->maskId($row['id_document_number']) : null,
                    'phone'            => $phone,
                    'email'            => $row['email'],
                    'city'             => $row['city'],
                    'provider_name'    => $providerName ?: 'Unassigned',
                    'registered_at'    => $row['created_at'] ? substr((string)$row['created_at'], 0, 10) : null,
                    'score'            => $matchResult['score'],
                    'match_level'      => $matchResult['level'],
                    'match_factors'    => $matchResult['factors']
                ];
            }
        }

        // Sort candidates descending by match score
        usort($matches, fn($a, $b) => $b['score'] <=> $a['score']);

        return $matches;
    }

    /**
     * Compute comprehensive match score (0-100) and factors between candidate and existing patient.
     */
    public function scoreMatch(array $candidate, array $target): array
    {
        $score = 0;
        $factors = [];

        $candNatId = $this->cleanIdNumber($candidate['national_id'] ?? ($candidate['id_document_number'] ?? null));
        $targetNatId = $this->cleanIdNumber($target['national_id'] ?? null);
        $targetDocNum = $this->cleanIdNumber($target['id_document_number'] ?? null);

        // 1. Official Government ID Match (Definitive Identifier)
        if (!empty($candNatId)) {
            if ($candNatId === $targetNatId || $candNatId === $targetDocNum) {
                return [
                    'score'   => 100,
                    'level'   => 'Definite Match (Official ID)',
                    'factors' => ['Exact match on official Government National ID / Card Number.']
                ];
            }
        }

        $cFirst = $this->normalizeText($candidate['first_name'] ?? '');
        $tFirst = $this->normalizeText($target['first_name'] ?? '');
        $cLast  = $this->normalizeText($candidate['last_name'] ?? '');
        $tLast  = $this->normalizeText($target['last_name'] ?? '');

        // 2. Last Name Scoring (Weight: up to 35 pts)
        $lastNameScore = 0;
        if (!empty($cLast) && !empty($tLast)) {
            if ($cLast === $tLast) {
                $lastNameScore = 35;
                $factors[] = "Exact last name match ('{$target['last_name']}').";
            } else {
                $metaCand = metaphone($cLast);
                $metaTgt  = metaphone($tLast);
                if ($metaCand !== '' && $metaCand === $metaTgt) {
                    $lastNameScore = 28;
                    $factors[] = "Phonetic last name match ('{$target['last_name']}' sounds like '{$candidate['last_name']}').";
                } elseif (soundex($cLast) === soundex($tLast)) {
                    $lastNameScore = 22;
                    $factors[] = "Soundex last name match ('{$target['last_name']}').";
                } else {
                    $lev = levenshtein($cLast, $tLast);
                    if ($lev <= 2 && strlen($cLast) >= 4) {
                        $lastNameScore = 20;
                        $factors[] = "Fuzzy last name match (typo distance {$lev}).";
                    }
                }
            }
        }
        $score += $lastNameScore;

        // 3. First Name Scoring (Weight: up to 30 pts)
        $firstNameScore = 0;
        if (!empty($cFirst) && !empty($tFirst)) {
            if ($cFirst === $tFirst) {
                $firstNameScore = 30;
                $factors[] = "Exact first name match ('{$target['first_name']}').";
            } else {
                $metaCandF = metaphone($cFirst);
                $metaTgtF  = metaphone($tFirst);
                if ($metaCandF !== '' && $metaCandF === $metaTgtF) {
                    $firstNameScore = 24;
                    $factors[] = "Phonetic first name match ('{$target['first_name']}' sounds like '{$candidate['first_name']}').";
                } elseif (soundex($cFirst) === soundex($tFirst)) {
                    $firstNameScore = 18;
                    $factors[] = "Soundex first name match ('{$target['first_name']}').";
                } else {
                    $levF = levenshtein($cFirst, $tFirst);
                    if ($levF <= 2 && strlen($cFirst) >= 4) {
                        $firstNameScore = 18;
                        $factors[] = "Fuzzy first name match (typo distance {$levF}).";
                    }
                }
            }
        }
        $score += $firstNameScore;

        // 4. Date of Birth Scoring (Weight: up to 35 pts)
        $candDob = !empty($candidate['birthdate']) ? trim((string)$candidate['birthdate']) : null;
        $targDob = !empty($target['birthdate']) ? trim((string)$target['birthdate']) : null;

        if ($candDob && $targDob) {
            if ($candDob === $targDob) {
                $score += 35;
                $factors[] = "Exact date of birth match ({$targDob}).";
            } elseif ($this->datesAreTransposed($candDob, $targDob)) {
                $score += 25;
                $factors[] = "Transposed birthdate match (month/day inversion: {$targDob}).";
            } elseif ($this->datesOffByOneYear($candDob, $targDob)) {
                $score += 15;
                $factors[] = "Close birthdate (same month and day, +/- 1 year tolerance: {$targDob}).";
            }
        }

        // 5. Sex Contradiction Penalty / Agreement
        $candSex = strtolower(trim((string)($candidate['sex'] ?? '')));
        $targSex = strtolower(trim((string)($target['sex'] ?? '')));
        if ($candSex && $targSex) {
            if ($candSex === $targSex) {
                $score += 5;
            } else {
                // If sex explicitly contradicts (male vs female), penalize heavily
                $score -= 25;
                $factors[] = "Explicit sex mismatch (candidate is '{$candSex}', record is '{$targSex}').";
            }
        }

        // 6. Contact & Demographic Corroboration (Up to +15 pts bonus)
        $cPhone = $this->cleanIdNumber($candidate['mobile_phone'] ?? ($candidate['home_phone'] ?? ''));
        $tPhone = $this->cleanIdNumber($target['mobile_phone'] ?? ($target['home_phone'] ?? ''));
        if (!empty($cPhone) && !empty($tPhone) && strlen($cPhone) >= 7) {
            if ($cPhone === $tPhone || str_ends_with($cPhone, substr($tPhone, -7)) || str_ends_with($tPhone, substr($cPhone, -7))) {
                $score += 10;
                $factors[] = "Matching contact telephone number.";
            }
        }

        $cEmail = strtolower(trim((string)($candidate['contact_email'] ?? ($candidate['email'] ?? ''))));
        $tEmail = strtolower(trim((string)($target['email'] ?? '')));
        if (!empty($cEmail) && !empty($tEmail) && $cEmail === $tEmail) {
            $score += 10;
            $factors[] = "Matching contact email address.";
        }

        $cCity = $this->normalizeText($candidate['city'] ?? '');
        $tCity = $this->normalizeText($target['city'] ?? '');
        if (!empty($cCity) && !empty($tCity) && $cCity === $tCity) {
            $score += 5;
            $factors[] = "Same residential city ('{$target['city']}').";
        }

        // Bounds clamp
        $score = max(0, min(100, $score));

        // Determine categorical confidence level
        $level = match (true) {
            $score >= self::THRESHOLD_CERTAIN  => 'High Probability Duplicate',
            $score >= self::THRESHOLD_PROBABLE => 'Probable Duplicate',
            $score >= self::THRESHOLD_POSSIBLE => 'Possible Match',
            default                            => 'Low Similarity'
        };

        return [
            'score'   => $score,
            'level'   => $level,
            'factors' => $factors
        ];
    }

    /**
     * Check if two YYYY-MM-DD dates have day and month swapped (e.g. 1990-05-08 vs 1990-08-05).
     */
    private function datesAreTransposed(string $d1, string $d2): bool
    {
        $p1 = explode('-', $d1);
        $p2 = explode('-', $d2);

        if (count($p1) !== 3 || count($p2) !== 3) {
            return false;
        }

        // Same year, swapped MM and DD
        return ($p1[0] === $p2[0]) && ($p1[1] === $p2[2]) && ($p1[2] === $p2[1]);
    }

    /**
     * Check if two dates share the exact month and day, with year off by +/- 1 year.
     */
    private function datesOffByOneYear(string $d1, string $d2): bool
    {
        $p1 = explode('-', $d1);
        $p2 = explode('-', $d2);

        if (count($p1) !== 3 || count($p2) !== 3) {
            return false;
        }

        $yearDiff = abs((int)$p1[0] - (int)$p2[0]);
        return ($yearDiff === 1) && ($p1[1] === $p2[1]) && ($p1[2] === $p2[2]);
    }

    /**
     * Normalize names by stripping accents, symbols, extra spaces, and suffixes.
     */
    private function normalizeText(?string $str): string
    {
        if ($str === null || $str === '') {
            return '';
        }

        $normalized = strtolower(trim($str));
        // Remove common Filipino/English prefixes/particles or punctuation
        $normalized = preg_replace('/[^a-z0-9]/', '', $normalized) ?? '';

        return $normalized;
    }

    /**
     * Strip all non-alphanumeric characters from identification numbers.
     */
    private function cleanIdNumber(?string $id): string
    {
        if ($id === null || $id === '') {
            return '';
        }

        return strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $id) ?? '');
    }

    /**
     * Mask ID numbers for display (e.g. 4920-****-****-3301).
     */
    private function maskId(string $id): string
    {
        $len = strlen($id);
        if ($len <= 4) {
            return $id;
        }

        return substr($id, 0, 3) . str_repeat('*', max(0, $len - 6)) . substr($id, -3);
    }
}
