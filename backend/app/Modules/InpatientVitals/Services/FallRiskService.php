<?php

namespace App\Modules\InpatientVitals\Services;

use App\Core\Database;
use PDO;

/**
 * Fall risk (Morse Fall Scale) for admitted patients: nurses score it, the admission keeps the
 * latest level (low / moderate / high) for the room TV's icon and the ward boards; every
 * assessment is kept.
 */
class FallRiskService
{
    /** item => [question, [answer => [label, points]]] */
    public const MORSE = [
        'history' => ['History of falling (now or in the last 3 months)', ['no' => ['No', 0], 'yes' => ['Yes', 25]]],
        'secondary_dx' => ['Secondary diagnosis (more than one medical diagnosis)', ['no' => ['No', 0], 'yes' => ['Yes', 15]]],
        'ambulatory_aid' => ['Ambulatory aid', ['none' => ['None, bed rest, or a nurse assists', 0], 'aid' => ['Crutches, cane or walker', 15], 'furniture' => ['Holds on to furniture', 30]]],
        'iv' => ['IV line or heparin lock', ['no' => ['No', 0], 'yes' => ['Yes', 20]]],
        'gait' => ['Gait', ['normal' => ['Normal, bed rest or wheelchair', 0], 'weak' => ['Weak', 10], 'impaired' => ['Impaired', 20]]],
        'mental' => ['Mental status', ['oriented' => ['Knows own limits', 0], 'forgets' => ['Overestimates or forgets limits', 15]]],
    ];
    public const LEVELS = ['low' => 'Low', 'moderate' => 'Moderate', 'high' => 'High'];

    public static function level(int $score): string
    {
        return $score >= 45 ? 'high' : ($score >= 25 ? 'moderate' : 'low');
    }

    /** The current level, the last assessments, and the form's questions. */
    public function current(int $admissionId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id, patient_name, fall_risk, fall_risk_score, fall_risk_at, status FROM inpatient_admissions WHERE id = :id");
        $stmt->execute(['id' => $admissionId]);
        $a = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$a) {
            return null;
        }
        $h = $db->prepare(
            "SELECT f.id, f.score, f.level, f.items_json, f.note, f.assessed_at,
                    (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                     FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = f.assessed_by LIMIT 1) AS assessed_by_name
             FROM inpatient_fall_assessments f WHERE f.admission_id = :a ORDER BY f.assessed_at DESC, f.id DESC LIMIT 10"
        );
        $h->execute(['a' => $admissionId]);
        $history = array_map(fn($r) => ['id' => (int) $r['id'], 'score' => (int) $r['score'], 'level' => $r['level'], 'items' => json_decode($r['items_json'], true),
            'note' => $r['note'], 'assessed_at' => $r['assessed_at'], 'assessed_by_name' => $r['assessed_by_name']], $h->fetchAll(PDO::FETCH_ASSOC));
        return [
            'admission_id' => (int) $a['id'], 'patient_name' => $a['patient_name'],
            'level' => $a['fall_risk'], 'level_label' => $a['fall_risk'] ? self::LEVELS[$a['fall_risk']] : null,
            'score' => $a['fall_risk_score'] !== null ? (int) $a['fall_risk_score'] : null, 'assessed_at' => $a['fall_risk_at'],
            'history' => $history, 'questions' => self::MORSE,
        ];
    }

    /** data: items {item: answer} (every Morse item), note? */
    public function assess(int $admissionId, array $data, array $actor): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id FROM inpatient_admissions WHERE id = :id AND status IN ('Admitted', 'Pending Discharge')");
        $stmt->execute(['id' => $admissionId]);
        if (!$stmt->fetchColumn()) {
            return ['success' => false, 'message' => 'The patient is not admitted.', 'not_found' => true];
        }
        $items = is_array($data['items'] ?? null) ? $data['items'] : [];
        $errors = [];
        $score = 0;
        $answers = [];
        foreach (self::MORSE as $key => [$question, $options]) {
            $answer = (string) ($items[$key] ?? '');
            if (!isset($options[$answer])) {
                $errors["items.{$key}"] = "Answer: {$question}.";
                continue;
            }
            $answers[$key] = $answer;
            $score += $options[$answer][1];
        }
        $note = trim((string) ($data['note'] ?? ''));
        if (mb_strlen($note) > 500) {
            $errors['note'] = 'Keep the note under 500 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $level = self::level($score);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $db->prepare("INSERT INTO inpatient_fall_assessments (admission_id, score, level, items_json, note, assessed_by, assessed_at) VALUES (:a, :s, :l, :i, :n, :u, :t)")
            ->execute(['a' => $admissionId, 's' => $score, 'l' => $level, 'i' => json_encode($answers), 'n' => $note !== '' ? $note : null, 'u' => (int) $actor['id'], 't' => $now]);
        $db->prepare("UPDATE inpatient_admissions SET fall_risk = :l, fall_risk_score = :s, fall_risk_at = :t WHERE id = :a")
            ->execute(['l' => $level, 's' => $score, 't' => $now, 'a' => $admissionId]);
        return ['success' => true, 'message' => "Fall risk: " . self::LEVELS[$level] . " (Morse {$score}).", 'data' => $this->current($admissionId)];
    }
}
