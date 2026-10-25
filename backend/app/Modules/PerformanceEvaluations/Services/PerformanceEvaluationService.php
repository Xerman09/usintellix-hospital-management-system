<?php

namespace App\Modules\PerformanceEvaluations\Services;

use App\Core\Database;
use PDO;
use Throwable;

class PerformanceEvaluationService
{
    /**
     * Generate sequential code PE-YYYY-0001
     */
    public static function generateEvaluationCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('PERF_EVAL', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'PERF_EVAL' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("PE-%d-%04d", $year, $num);
    }

    /**
     * Compute Composite Score & Performance Tier
     */
    public static function computeScoreAndTier(float $clinical, float $bedside, float $doc, float $teamwork, float $ethics): array
    {
        $overall = round(($clinical + $bedside + $doc + $teamwork + $ethics) / 5.0, 2);

        if ($overall >= 4.50) {
            $tier = 'exceptional';
            $tierLabel = 'Exceptional / Role Model';
        } elseif ($overall >= 3.50) {
            $tier = 'exceeds_expectations';
            $tierLabel = 'Exceeds Expectations';
        } elseif ($overall >= 2.80) {
            $tier = 'meets_expectations';
            $tierLabel = 'Meets Expectations';
        } elseif ($overall >= 2.00) {
            $tier = 'needs_development';
            $tierLabel = 'Needs Development';
        } else {
            $tier = 'unsatisfactory';
            $tierLabel = 'Unsatisfactory (PIP Required)';
        }

        return [
            'overall_score' => $overall,
            'performance_tier' => $tier,
            'performance_tier_label' => $tierLabel
        ];
    }

    /**
     * Executive Overview & Governance Metrics
     */
    public function getExecutiveMetrics(int $year = 2026): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                COUNT(*) as total_evaluations,
                ROUND(AVG(overall_score), 2) as avg_composite_score,
                ROUND(AVG(score_clinical_competence), 2) as avg_clinical_score,
                ROUND(AVG(score_bedside_manner), 2) as avg_bedside_score,
                ROUND(AVG(score_documentation_accuracy), 2) as avg_doc_score,
                ROUND(AVG(score_teamwork_ethics), 2) as avg_teamwork_score,
                ROUND(AVG(score_professionalism_compliance), 2) as avg_ethics_score,
                SUM(CASE WHEN performance_tier = 'exceptional' THEN 1 ELSE 0 END) as exceptional_count,
                SUM(CASE WHEN performance_tier = 'exceeds_expectations' THEN 1 ELSE 0 END) as exceeds_count,
                SUM(CASE WHEN performance_tier = 'meets_expectations' THEN 1 ELSE 0 END) as meets_count,
                SUM(CASE WHEN performance_tier = 'needs_development' THEN 1 ELSE 0 END) as needs_dev_count,
                SUM(CASE WHEN performance_tier = 'unsatisfactory' THEN 1 ELSE 0 END) as unsatisfactory_count
            FROM `hr_performance_evaluations`
            WHERE `evaluation_year` = ?
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$year]);
        $m = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $total = (int)($m['total_evaluations'] ?? 0);
        $exceptional = (int)($m['exceptional_count'] ?? 0);
        $exceeds = (int)($m['exceeds_count'] ?? 0);
        $meets = (int)($m['meets_count'] ?? 0);
        $needsDev = (int)($m['needs_dev_count'] ?? 0);
        $unsatisfactory = (int)($m['unsatisfactory_count'] ?? 0);

        // High performer rate (% >= 3.50)
        $highPerformerRate = $total > 0 ? round((($exceptional + $exceeds) / $total) * 100, 1) : 0;

        // Recommendations distribution
        $stmtRec = $pdo->prepare("
            SELECT evaluator_recommendation, COUNT(*) as cnt
            FROM `hr_performance_evaluations`
            WHERE `evaluation_year` = ?
            GROUP BY evaluator_recommendation
        ");
        $stmtRec->execute([$year]);
        $recs = $stmtRec->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];

        // Cycle breakdown
        $stmtCycle = $pdo->prepare("
            SELECT evaluation_cycle, COUNT(*) as cnt
            FROM `hr_performance_evaluations`
            WHERE `evaluation_year` = ?
            GROUP BY evaluation_cycle
        ");
        $stmtCycle->execute([$year]);
        $cycles = $stmtCycle->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];

        return [
            'year' => $year,
            'total_evaluations' => $total,
            'avg_composite_score' => (float)($m['avg_composite_score'] ?? 0),
            'high_performer_rate' => $highPerformerRate,
            'rubric_averages' => [
                'clinical_competence' => (float)($m['avg_clinical_score'] ?? 0),
                'bedside_manner' => (float)($m['avg_bedside_score'] ?? 0),
                'documentation_accuracy' => (float)($m['avg_doc_score'] ?? 0),
                'teamwork_ethics' => (float)($m['avg_teamwork_score'] ?? 0),
                'professionalism_compliance' => (float)($m['avg_ethics_score'] ?? 0)
            ],
            'tier_distribution' => [
                'exceptional' => $exceptional,
                'exceeds_expectations' => $exceeds,
                'meets_expectations' => $meets,
                'needs_development' => $needsDev,
                'unsatisfactory' => $unsatisfactory
            ],
            'recommendations_breakdown' => $recs,
            'cycles_breakdown' => $cycles
        ];
    }

    /**
     * List Evaluations with Pagination and Filtering
     */
    public function listEvaluations(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['employee_id'])) {
            $where[] = "pe.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['department_id'])) {
            $where[] = "pe.department_id = ?";
            $params[] = (int)$filters['department_id'];
        }

        if (!empty($filters['evaluation_cycle'])) {
            $where[] = "pe.evaluation_cycle = ?";
            $params[] = $filters['evaluation_cycle'];
        }

        if (!empty($filters['evaluator_type'])) {
            $where[] = "pe.evaluator_type = ?";
            $params[] = $filters['evaluator_type'];
        }

        if (!empty($filters['performance_tier'])) {
            $where[] = "pe.performance_tier = ?";
            $params[] = $filters['performance_tier'];
        }

        if (!empty($filters['year'])) {
            $where[] = "pe.evaluation_year = ?";
            $params[] = (int)$filters['year'];
        }

        if (!empty($filters['status'])) {
            $where[] = "pe.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(pe.employee_name LIKE ? OR pe.job_title LIKE ? OR pe.evaluator_name LIKE ? OR pe.evaluation_code LIKE ? OR pe.department_name LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM `hr_performance_evaluations` pe WHERE {$whereClause}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT pe.*
            FROM `hr_performance_evaluations` pe
            WHERE {$whereClause}
            ORDER BY pe.overall_score DESC, pe.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $currentYear = !empty($filters['year']) ? (int)$filters['year'] : (int)date('Y');

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records,
            'metrics' => $this->getExecutiveMetrics($currentYear)
        ];
    }

    /**
     * Get Evaluation Detail
     */
    public function getEvaluationDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT
                pe.*,
                e.employee_no,
                e.email as employee_email,
                e.phone as employee_phone
            FROM `hr_performance_evaluations` pe
            LEFT JOIN `employees` e ON pe.employee_id = e.id
            WHERE pe.id = ?
        ");
        $stmt->execute([$id]);
        $eval = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$eval) return null;

        return [
            'evaluation' => $eval,
            'rubric_details' => [
                'clinical_competence' => [
                    'label' => 'Clinical Competence & Procedural Acumen',
                    'score' => (float)$eval['score_clinical_competence'],
                    'criteria' => 'Diagnostic accuracy, clinical guidelines adherence, procedural skill, crisis management.'
                ],
                'bedside_manner' => [
                    'label' => 'Bedside Manner & Patient Communication',
                    'score' => (float)$eval['score_bedside_manner'],
                    'criteria' => 'Patient empathy, active listening, clear explanations, informed consent, patient family satisfaction.'
                ],
                'documentation_accuracy' => [
                    'label' => 'Documentation Accuracy & Chart Timeliness',
                    'score' => (float)$eval['score_documentation_accuracy'],
                    'criteria' => 'SOAP note completeness, timely electronic sign-off, CPOE order precision, HIPAA compliance.'
                ],
                'teamwork_ethics' => [
                    'label' => 'Teamwork & Interprofessional Collaboration',
                    'score' => (float)$eval['score_teamwork_ethics'],
                    'criteria' => 'Multidisciplinary communication, shift handoff efficacy, respectful colleague interactions, conflict resolution.'
                ],
                'professionalism_compliance' => [
                    'label' => 'Professionalism, Ethics & Compliance',
                    'score' => (float)$eval['score_professionalism_compliance'],
                    'criteria' => 'Hospital policy adherence, CME attendance, punctuality, ethical clinical conduct, regulatory vigilance.'
                ]
            ]
        ];
    }

    /**
     * Save Performance Evaluation (Create or Update)
     */
    public function saveEvaluation(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $id = !empty($data['id']) ? (int)$data['id'] : null;
            $employeeId = (int)($data['employee_id'] ?? 0);

            // Fetch employee details if missing
            $employeeName = trim($data['employee_name'] ?? '');
            $jobTitle = trim($data['job_title'] ?? '');
            $deptId = !empty($data['department_id']) ? (int)$data['department_id'] : null;
            $deptName = trim($data['department_name'] ?? '');

            if ($employeeId > 0 && (empty($employeeName) || empty($deptName))) {
                $stmtEmp = $pdo->prepare("
                    SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) as name, e.department_id, d.name as dept_name
                    FROM employees e
                    LEFT JOIN departments d ON e.department_id = d.id
                    WHERE e.id = ?
                ");
                $stmtEmp->execute([$employeeId]);
                $emp = $stmtEmp->fetch(PDO::FETCH_ASSOC);
                if ($emp) {
                    if (empty($employeeName)) $employeeName = $emp['name'];
                    if (empty($deptName)) $deptName = $emp['dept_name'] ?: 'Clinical Services';
                    if (!$deptId) $deptId = (int)$emp['department_id'];
                }
            }

            $cycle = $data['evaluation_cycle'] ?? 'annual';
            $startDate = $data['evaluation_period_start'] ?? date('Y-01-01');
            $endDate = $data['evaluation_period_end'] ?? date('Y-12-31');
            $year = !empty($data['evaluation_year']) ? (int)$data['evaluation_year'] : (int)date('Y', strtotime($endDate));

            $evaluatorType = $data['evaluator_type'] ?? 'supervisor';
            $evaluatorId = !empty($data['evaluator_id']) ? (int)$data['evaluator_id'] : null;
            $evaluatorName = trim($data['evaluator_name'] ?? 'Clinical Supervisor');
            $evaluatorTitle = trim($data['evaluator_title'] ?? 'Department Chair / Medical Director');

            // 5-Tier Rubric Scores (1.00 to 5.00)
            $clinical = max(1.00, min(5.00, (float)($data['score_clinical_competence'] ?? 3.00)));
            $bedside = max(1.00, min(5.00, (float)($data['score_bedside_manner'] ?? 3.00)));
            $doc = max(1.00, min(5.00, (float)($data['score_documentation_accuracy'] ?? 3.00)));
            $teamwork = max(1.00, min(5.00, (float)($data['score_teamwork_ethics'] ?? 3.00)));
            $ethics = max(1.00, min(5.00, (float)($data['score_professionalism_compliance'] ?? 3.00)));

            // Compute composite & tier
            $scoring = self::computeScoreAndTier($clinical, $bedside, $doc, $teamwork, $ethics);
            $overallScore = $scoring['overall_score'];
            $tier = $scoring['performance_tier'];

            // Qualitative sections
            $strengths = !empty($data['key_strengths']) ? trim($data['key_strengths']) : null;
            $areasDev = !empty($data['areas_for_development']) ? trim($data['areas_for_development']) : null;
            $goals = !empty($data['development_goals']) ? trim($data['development_goals']) : null;
            $actionPlan = !empty($data['action_plan']) ? trim($data['action_plan']) : null;
            $recommendation = $data['evaluator_recommendation'] ?? 'recredential_full_privileges';
            $recNotes = !empty($data['recommendation_notes']) ? trim($data['recommendation_notes']) : null;

            $status = $data['status'] ?? 'finalized';
            $employeeComments = !empty($data['employee_comments']) ? trim($data['employee_comments']) : null;
            $approvingName = !empty($data['approving_officer_name']) ? trim($data['approving_officer_name']) : 'Dr. Arthur Sterling, MD';
            $approvingTitle = !empty($data['approving_officer_title']) ? trim($data['approving_officer_title']) : 'Chief Medical Officer';

            if ($id) {
                // Update
                $stmt = $pdo->prepare("
                    UPDATE `hr_performance_evaluations` SET
                        `employee_id` = ?,
                        `employee_name` = ?,
                        `job_title` = ?,
                        `department_id` = ?,
                        `department_name` = ?,
                        `evaluation_cycle` = ?,
                        `evaluation_period_start` = ?,
                        `evaluation_period_end` = ?,
                        `evaluation_year` = ?,
                        `evaluator_type` = ?,
                        `evaluator_id` = ?,
                        `evaluator_name` = ?,
                        `evaluator_title` = ?,
                        `score_clinical_competence` = ?,
                        `score_bedside_manner` = ?,
                        `score_documentation_accuracy` = ?,
                        `score_teamwork_ethics` = ?,
                        `score_professionalism_compliance` = ?,
                        `overall_score` = ?,
                        `performance_tier` = ?,
                        `key_strengths` = ?,
                        `areas_for_development` = ?,
                        `development_goals` = ?,
                        `action_plan` = ?,
                        `evaluator_recommendation` = ?,
                        `recommendation_notes` = ?,
                        `status` = ?,
                        `employee_comments` = ?,
                        `approving_officer_name` = ?,
                        `approving_officer_title` = ?,
                        `updated_at` = NOW()
                    WHERE `id` = ?
                ");
                $stmt->execute([
                    $employeeId, $employeeName, $jobTitle, $deptId, $deptName,
                    $cycle, $startDate, $endDate, $year, $evaluatorType,
                    $evaluatorId, $evaluatorName, $evaluatorTitle,
                    $clinical, $bedside, $doc, $teamwork, $ethics,
                    $overallScore, $tier, $strengths, $areasDev,
                    $goals, $actionPlan, $recommendation, $recNotes,
                    $status, $employeeComments, $approvingName, $approvingTitle,
                    $id
                ]);
                $code = $data['evaluation_code'] ?? "PE-{$id}";
            } else {
                // Insert
                $code = self::generateEvaluationCode($pdo);
                $stmt = $pdo->prepare("
                    INSERT INTO `hr_performance_evaluations` (
                        `evaluation_code`, `employee_id`, `employee_name`, `job_title`,
                        `department_id`, `department_name`, `evaluation_cycle`, `evaluation_period_start`,
                        `evaluation_period_end`, `evaluation_year`, `evaluator_type`, `evaluator_id`,
                        `evaluator_name`, `evaluator_title`, `score_clinical_competence`, `score_bedside_manner`,
                        `score_documentation_accuracy`, `score_teamwork_ethics`, `score_professionalism_compliance`,
                        `overall_score`, `performance_tier`, `key_strengths`, `areas_for_development`,
                        `development_goals`, `action_plan`, `evaluator_recommendation`, `recommendation_notes`,
                        `status`, `employee_comments`, `employee_acknowledged_at`, `approving_officer_name`,
                        `approving_officer_title`, `approved_at`, `created_by`, `created_at`, `updated_at`
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, NOW(), ?,
                        ?, NOW(), ?, NOW(), NOW()
                    )
                ");
                $stmt->execute([
                    $code, $employeeId, $employeeName, $jobTitle,
                    $deptId, $deptName, $cycle, $startDate,
                    $endDate, $year, $evaluatorType, $evaluatorId,
                    $evaluatorName, $evaluatorTitle, $clinical, $bedside,
                    $doc, $teamwork, $ethics,
                    $overallScore, $tier, $strengths, $areasDev,
                    $goals, $actionPlan, $recommendation, $recNotes,
                    $status, $employeeComments, $approvingName,
                    $approvingTitle, $userId
                ]);
                $id = (int)$pdo->lastInsertId();
            }

            $pdo->commit();

            return [
                'id' => $id,
                'evaluation_code' => $code,
                'overall_score' => $overallScore,
                'performance_tier' => $tier,
                'message' => "Performance evaluation #{$code} saved successfully with overall composite score of {$overallScore} ({$scoring['performance_tier_label']})."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Delete Evaluation
     */
    public function deleteEvaluation(int $id): bool
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("DELETE FROM `hr_performance_evaluations` WHERE `id` = ?");
        return $stmt->execute([$id]);
    }

    /**
     * Acknowledge Evaluation by Employee
     */
    public function acknowledgeEvaluation(int $id, string $employeeComments): bool
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            UPDATE `hr_performance_evaluations`
            SET `status` = 'acknowledged',
                `employee_comments` = ?,
                `employee_acknowledged_at` = NOW()
            WHERE `id` = ?
        ");
        return $stmt->execute([$employeeComments, $id]);
    }

    /**
     * Metadata for UI dropdowns
     */
    public function getMetadata(): array
    {
        $pdo = Database::connection();

        $staff = $pdo->query("
            SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) as full_name, e.department_id, d.name as department_name, e.duty_tag
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            ORDER BY e.last_name ASC, e.first_name ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        $departments = $pdo->query("SELECT id, name FROM departments ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

        $cycles = [
            'annual' => 'Annual Performance Appraisal',
            'semi_annual' => 'Semi-Annual Clinical Review',
            'probationary' => 'Probationary / Pre-Regularization Review',
            'recredentialing_peer_review' => 'Recredentialing Peer Review',
            'quarterly' => 'Quarterly Formative Evaluation'
        ];

        $evaluatorTypes = [
            'supervisor' => 'Direct Department Head / Clinical Supervisor',
            'peer' => 'Peer Review (Attending Colleague)',
            'department_chair' => 'Department Chairperson / Medical Director',
            'self' => 'Self-Appraisal',
            'multidisciplinary' => 'Multidisciplinary 360-Degree Review'
        ];

        $recommendations = [
            'recredential_full_privileges' => 'Recredential Full Clinical Privileges',
            'eligible_for_merit_promotion' => 'Eligible for Merit Promotion / Executive Bonus',
            'regularize_employment' => 'Regularize Employment Status',
            'continue_current_tier' => 'Continue Current Clinical Tier',
            'targeted_clinical_supervision' => 'Targeted Clinical Supervision & Mentorship',
            'performance_improvement_plan' => 'Performance Improvement Plan (PIP)'
        ];

        $rubricCriteria = [
            'clinical_competence' => [
                'name' => '1. Clinical Competence & Procedural Acumen',
                'description' => 'Diagnostic accuracy, clinical guidelines adherence, procedural skill, crisis response, patient safety vigilance.'
            ],
            'bedside_manner' => [
                'name' => '2. Bedside Manner & Patient Communication',
                'description' => 'Compassion, patient/family explanations, active listening, informed consent, empathy, HCAHPS patient feedback.'
            ],
            'documentation_accuracy' => [
                'name' => '3. Documentation Accuracy & Timeliness',
                'description' => 'SOAP notes completeness, CPOE order precision, electronic discharge turnaround, billing coding clarity, HIPAA.'
            ],
            'teamwork_ethics' => [
                'name' => '4. Teamwork & Interprofessional Collaboration',
                'description' => 'Multidisciplinary rounds, respectful nurse-physician communication, shift handoff efficacy, conflict resolution.'
            ],
            'professionalism_compliance' => [
                'name' => '5. Professionalism, Ethics & Compliance',
                'description' => 'Punctuality, hospital bylaws adherence, CME/CPD participation, integrity, zero code of conduct infractions.'
            ]
        ];

        return [
            'staff' => $staff,
            'departments' => $departments,
            'cycles' => $cycles,
            'evaluator_types' => $evaluatorTypes,
            'recommendations' => $recommendations,
            'rubric_criteria' => $rubricCriteria
        ];
    }
}
