<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;

/**
 * The plain-language guide shown under a diagnosis in My Chart: what the condition
 * is, what to do, what not to do, and when to get help now. See schema 333.
 *
 * Matching is the whole difficulty. A diagnosis reaches a patient in four shapes
 * and only encounter_diagnoses is reliably coded, so a guide is found by, in order:
 *
 *   1. the exact ICD-10 code              'E11.9' -> the guide whose code is E11.9
 *   2. the longest matching keyword       'Severe Sepsis secondary to
 *                                          Pyelonephritis' -> 'pyelonephritis'
 *   3. the code's 3-character category    'E11.9' -> the guide whose code is E11
 *
 * Keyword before category because the words a clinician wrote are more specific
 * evidence than the ICD chapter the code falls in, and a category is a broad
 * catch-all by construction ('E11' is every type 2 diabetes there is).
 *
 * Codes are dug out of the text as well as read from a column, because the text
 * carries them in several house styles: 'K80.00 Acute Cholecystitis...' (discharge
 * summaries) and 'A01.00 - Typhoid fever, unspecified (ICD-10-CM)' several to a
 * row (patient_medical_problems.coding).
 *
 * A row with no match is simply absent from the returned map and the app shows no
 * button for it. That is deliberate: no guide reads better to a patient than a
 * guide about the wrong condition.
 *
 * The hospital owns the wording (staff tab "portal_diagnosis_guides"), so nothing
 * here is hard-coded -- a seeded row is only a starting point.
 */
class PortalDiagnosisGuideService
{
    /** Who may read the authored guides, and who may write them. */
    public const VIEW_ROLES = ['admin', 'doctor', 'clinician', 'nurse'];
    public const EDIT_ROLES = ['admin', 'doctor'];

    /**
     * An ICD-10 code as it appears in free text: a letter, two digits (the second
     * may be A or B), then an optional dotted remainder. Anchored on a word
     * boundary so "Day 3" and "x3 graft" cannot look like codes.
     */
    private const CODE_PATTERN = '/\b([A-TV-Z][0-9][0-9AB](?:\.[0-9A-TV-Z]{1,4})?)\b/';

    /**
     * Guides for a set of diagnosis rows, keyed by each row's own label so the
     * caller can line them up with what it is already rendering. One query,
     * whatever the number of rows.
     *
     * @param array $rows each with 'code' and/or 'text' (the description/title)
     * @return array<string, array>
     */
    public static function forDiagnoses(array $rows): array
    {
        $wanted = [];
        foreach ($rows as $r) {
            $label = self::label($r);
            if ($label === '') {
                continue;
            }
            $wanted[$label] = self::codesIn($r);
        }

        if (!$wanted) {
            return [];
        }

        $guides = self::activeGuides();
        if (!$guides) {
            return [];
        }

        $out = [];
        foreach ($wanted as $label => $codes) {
            $hit = self::resolve($guides, $codes, $label);
            if ($hit !== null) {
                $out[$label] = $hit;
            }
        }

        return $out;
    }

    /**
     * Every code a row offers, in the order they were written: the code column
     * first, then any code written into the text. De-duplicated, upper-cased,
     * dots kept.
     *
     * All of them, not the first: patient_medical_problems.coding holds several
     * codes to a row, newline separated ('A00.1 - Cholera ... (ICD-10-CM)' then
     * 'A01.00 - Typhoid fever ...'), and reading only the first means a row whose
     * leading code happens to have no guide finds nothing although a later one
     * would have matched.
     *
     * @return string[]
     */
    private static function codesIn(array $row): array
    {
        $codes = [];

        foreach (['code', 'text'] as $field) {
            $value = strtoupper(trim((string) ($row[$field] ?? '')));
            if ($value !== '' && preg_match_all(self::CODE_PATTERN, $value, $m)) {
                foreach ($m[1] as $found) {
                    $codes[] = $found;
                }
            }
        }

        return array_values(array_unique($codes));
    }

    /** The label the caller will key its own rendering on. */
    private static function label(array $row): string
    {
        $text = trim((string) ($row['text'] ?? ''));

        return $text !== '' ? $text : strtoupper(trim((string) ($row['code'] ?? '')));
    }

    /**
     * Exact code, then keyword, then category.
     *
     * Where a diagnosis names more than one condition ('Resolved Acute Bronchitis,
     * Secondary Mild Dehydration') the longest keyword decides, which is a
     * tie-break and not clinical reasoning. The way to make a specific diagnosis
     * read a specific guide is to author that guide against the exact code, which
     * step 1 then settles before any guessing happens.
     */
    private static function resolve(array $guides, array $codes, string $label): ?array
    {
        foreach ($codes as $code) {
            $hit = self::byCode($guides, $code);
            if ($hit !== null) {
                return $hit;
            }
        }

        $hit = self::byKeyword($guides, $label);
        if ($hit !== null) {
            return $hit;
        }

        foreach ($codes as $code) {
            $hit = self::byCode($guides, substr($code, 0, 3));
            if ($hit !== null) {
                return $hit;
            }
        }

        return null;
    }

    /** The guide whose code is exactly this, longest code first. */
    private static function byCode(array $guides, string $code): ?array
    {
        $best = null;
        foreach ($guides as $g) {
            if ($g['code'] !== '' && $g['code'] === $code) {
                if ($best === null || strlen($g['code']) > strlen($best['code'])) {
                    $best = $g;
                }
            }
        }

        return $best ? self::out($best) : null;
    }

    /**
     * The guide with the longest keyword contained in this text. Longest wins so
     * that "diabetic ketoacidosis" is not answered by the guide for "diabetes",
     * and a free-text line naming two conditions resolves to the more specific.
     */
    private static function byKeyword(array $guides, string $label): ?array
    {
        $haystack = self::matchable($label);
        $best = null;
        $bestLen = 0;

        foreach ($guides as $g) {
            foreach ($g['keyword_list'] as $kw) {
                $len = mb_strlen($kw);
                if ($len > $bestLen && mb_strpos($haystack, $kw) !== false) {
                    $best = $g;
                    $bestLen = $len;
                }
            }
        }

        return $best ? self::out($best) : null;
    }

    /** Every active guide, shaped for matching. The table is small and read often. */
    private static function activeGuides(): array
    {
        $rows = Database::connection()->query(
            "SELECT id, title, code, keywords, about, why_it_happens, common_symptoms,
                    dos, donts, when_to_seek_help, source
             FROM portal_diagnosis_guides
             WHERE is_active = 1"
        )->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static function (array $r): array {
            $r['code'] = strtoupper(trim((string) $r['code']));
            $r['keyword_list'] = self::keywordList((string) $r['keywords'], (string) $r['title']);

            return $r;
        }, $rows);
    }

    /**
     * The keywords a guide can be found by. The title is always one of them, so a
     * guide is matchable even when nobody filled the keywords in. Padded with
     * spaces to match whole words, which stops "ra" inside "surgery".
     *
     * @return string[]
     */
    private static function keywordList(string $keywords, string $title): array
    {
        $parts = array_merge([$title], explode(',', $keywords));
        $out = [];

        foreach ($parts as $part) {
            $kw = self::matchable($part);
            if (trim($kw) !== '') {
                $out[] = $kw;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * Text reduced to space-separated words, padded with a space at each end, so a
     * keyword matches on whole words only.
     *
     * Punctuation becomes a space rather than being stripped, because a diagnosis
     * is written with it: in 'Resolved Acute Bronchitis, Secondary Mild Dehydration'
     * the word to find is followed by a comma, and a keyword padded with spaces
     * would never be found in it. Padding is what stops 'ra' matching inside
     * 'surgery'.
     */
    private static function matchable(string $text): string
    {
        return ' ' . trim(preg_replace('/[^a-z0-9]+/u', ' ', mb_strtolower($text))) . ' ';
    }

    /** One guide as the patient app receives it. Lists arrive split, ready to render. */
    private static function out(array $g): array
    {
        return [
            'title' => $g['title'],
            'about' => self::blank($g['about']),
            'why_it_happens' => self::blank($g['why_it_happens']),
            'common_symptoms' => self::blank($g['common_symptoms']),
            'dos' => self::lines($g['dos']),
            'donts' => self::lines($g['donts']),
            'when_to_seek_help' => self::lines($g['when_to_seek_help']),
            'source' => self::blank($g['source']),
        ];
    }

    /** A textarea's worth of lines as a list, blank lines dropped. */
    private static function lines(?string $value): array
    {
        if ($value === null || trim($value) === '') {
            return [];
        }

        $out = [];
        foreach (preg_split('/\r\n|\r|\n/', $value) as $line) {
            // An author who typed their own bullets should not get two.
            $line = trim(preg_replace('/^[\s\-\*\x{2022}\x{00B7}]+/u', '', $line));
            if ($line !== '') {
                $out[] = $line;
            }
        }

        return $out;
    }

    private static function blank(?string $value): ?string
    {
        return ($value === null || trim($value) === '') ? null : trim($value);
    }

    // ------------------------------------------------------------------
    // The patient endpoint
    // ------------------------------------------------------------------

    /**
     * Guides for diagnoses this patient actually has.
     *
     * The filter matters: without it the endpoint is an open ICD-10 dictionary and
     * every "patient read about condition X" line in the audit log becomes
     * meaningless, because anyone could ask about anything. So each requested row
     * has to correspond to something in this patient's own record.
     *
     * @param array $items each with 'code' and/or 'text', as the app rendered them
     */
    public static function forPatient(int $patientId, array $items): array
    {
        $own = self::diagnosesOf($patientId);
        if (!$own) {
            return [];
        }

        $ownCodes = [];
        $ownText = [];
        foreach ($own as $row) {
            foreach (self::codesIn($row) as $code) {
                $ownCodes[$code] = true;
            }
            $text = mb_strtolower(trim((string) ($row['text'] ?? '')));
            if ($text !== '') {
                $ownText[] = $text;
            }
        }

        $allowed = [];
        foreach ($items as $item) {
            $row = [
                'code' => (string) ($item['code'] ?? ''),
                'text' => (string) ($item['text'] ?? ''),
            ];

            if (self::isOwn($row, $ownCodes, $ownText)) {
                $allowed[] = $row;
            }
        }

        return $allowed ? self::forDiagnoses($allowed) : [];
    }

    /**
     * Does this requested row correspond to a diagnosis the patient has? Either one
     * of its codes is one of theirs, or its text is one of theirs (compared whole,
     * after collapsing whitespace -- a substring would let a one-word request stand
     * in for anything).
     */
    private static function isOwn(array $row, array $ownCodes, array $ownText): bool
    {
        foreach (self::codesIn($row) as $code) {
            if (isset($ownCodes[$code])) {
                return true;
            }
        }

        $text = preg_replace('/\s+/', ' ', mb_strtolower(trim((string) $row['text'])));
        if ($text === '') {
            return false;
        }

        foreach ($ownText as $mine) {
            if (preg_replace('/\s+/', ' ', $mine) === $text) {
                return true;
            }
        }

        return false;
    }

    /**
     * Every diagnosis on this patient's record, from all four places one can be
     * written: the coded encounter list, the problem list, discharge summaries and
     * ER visits.
     *
     * @return array<array{code: string, text: string}>
     */
    private static function diagnosesOf(int $patientId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT d.code AS code, COALESCE(d.description, '') AS text
               FROM encounter_diagnoses d
               JOIN encounters e ON e.id = d.encounter_id
              WHERE e.patient_id = :p AND d.deleted_at IS NULL AND e.deleted_at IS NULL

             UNION ALL

             SELECT COALESCE(p.coding, '') AS code, p.title AS text
               FROM patient_medical_problems p
              WHERE p.patient_id = :p2 AND p.deleted_at IS NULL

             UNION ALL

             SELECT '' AS code, s.admitting_diagnosis AS text
               FROM inpatient_discharge_summaries s
              WHERE s.patient_id = :p3 AND s.admitting_diagnosis IS NOT NULL

             UNION ALL

             SELECT '' AS code, s.discharge_diagnosis AS text
               FROM inpatient_discharge_summaries s
              WHERE s.patient_id = :p4 AND s.discharge_diagnosis IS NOT NULL

             UNION ALL

             SELECT '' AS code, v.er_diagnosis AS text
               FROM er_visits v
              WHERE v.patient_id = :p5 AND v.er_diagnosis IS NOT NULL"
        );
        $stmt->execute(['p' => $patientId, 'p2' => $patientId, 'p3' => $patientId, 'p4' => $patientId, 'p5' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ------------------------------------------------------------------
    // The staff screen
    // ------------------------------------------------------------------

    /** Every guide, with the diagnoses patients have actually received that none covers. */
    public static function listAll(string $q = ''): array
    {
        $db = Database::connection();
        $params = [];
        $where = '';

        if ($q !== '') {
            $where = "WHERE g.title LIKE :q OR g.code LIKE :q2 OR g.keywords LIKE :q3";
            $params = ['q' => "%{$q}%", 'q2' => "%{$q}%", 'q3' => "%{$q}%"];
        }

        $stmt = $db->prepare(
            "SELECT g.id, g.title, g.code, g.keywords, g.about, g.why_it_happens, g.common_symptoms,
                    g.dos, g.donts, g.when_to_seek_help, g.source, g.is_active, g.updated_at
             FROM portal_diagnosis_guides g
             {$where}
             ORDER BY g.title"
        );
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $missing = self::uncovered();

        return [
            'items' => array_map(static fn(array $r) => $r + [
                'is_active' => (int) $r['is_active'] === 1,
                'dos_count' => count(self::lines($r['dos'])),
                'donts_count' => count(self::lines($r['donts'])),
            ], $items),
            'missing' => $missing,
            'counts' => ['guides' => count($items), 'missing' => count($missing)],
        ];
    }

    /**
     * The diagnoses patients have been given that no guide answers, commonest
     * first, so the gaps are visible on the screen rather than discovered by a
     * patient. Resolution is done in PHP because a guide can match on a category
     * or a keyword, neither of which SQL can express against this data.
     */
    private static function uncovered(): array
    {
        $db = Database::connection();

        $rows = $db->query(
            "SELECT d.code AS code, COALESCE(d.description, '') AS text, COUNT(*) AS seen
               FROM encounter_diagnoses d
              WHERE d.deleted_at IS NULL
              GROUP BY d.code, d.description

             UNION ALL

             SELECT COALESCE(p.coding, '') AS code, p.title AS text, COUNT(*) AS seen
               FROM patient_medical_problems p
              WHERE p.deleted_at IS NULL
              GROUP BY p.coding, p.title

             UNION ALL

             SELECT '' AS code, s.discharge_diagnosis AS text, COUNT(*) AS seen
               FROM inpatient_discharge_summaries s
              WHERE s.discharge_diagnosis IS NOT NULL
              GROUP BY s.discharge_diagnosis"
        )->fetchAll(PDO::FETCH_ASSOC);

        $guides = self::activeGuides();
        $out = [];

        foreach ($rows as $row) {
            $label = self::label($row);
            if ($label === '') {
                continue;
            }
            $codes = self::codesIn($row);
            if (self::resolve($guides, $codes, $label) !== null) {
                continue;
            }
            $out[] = [
                'code' => $codes[0] ?? null,
                'text' => mb_substr($label, 0, 120),
                'seen' => (int) $row['seen'],
            ];
        }

        usort($out, static fn(array $a, array $b) => $b['seen'] <=> $a['seen']);

        return array_slice($out, 0, 60);
    }

    /**
     * Add or reword one guide. Keyed on `title`, so saving the same title twice
     * edits it instead of creating a second row.
     */
    public static function save(array $data, int $actorId): array
    {
        $title = trim((string) ($data['title'] ?? ''));
        $code = strtoupper(trim((string) ($data['code'] ?? '')));

        if ($title === '') {
            return ['success' => false, 'message' => 'What condition is this about?',
                'errors' => ['title' => 'The condition name is required.']];
        }

        if ($code !== '' && !preg_match('/^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,4})?$/', $code)) {
            return ['success' => false, 'message' => 'That does not look like an ICD-10 code.',
                'errors' => ['code' => 'Use a code like E11.9, or a category like E11. Leave it empty to match on keywords alone.']];
        }

        $text = static fn($v) => ($v === null || trim((string) $v) === '') ? null : trim((string) $v);

        if ($text($data['about'] ?? null) === null) {
            return ['success' => false, 'message' => 'Say what the condition is.',
                'errors' => ['about' => 'A patient needs at least this much.']];
        }

        // A guide with no code and no keywords can never be found. The title is a
        // keyword in its own right, so this only catches a title nothing is written
        // the way a diagnosis is -- worth saying before it is saved and never seen.
        if ($code === '' && $text($data['keywords'] ?? null) === null) {
            return ['success' => false, 'message' => 'This guide would never be found.',
                'errors' => ['keywords' => 'Give an ICD-10 code, or the words a diagnosis is written with.']];
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "INSERT INTO portal_diagnosis_guides
                (title, code, keywords, about, why_it_happens, common_symptoms, dos, donts,
                 when_to_seek_help, source, is_active, created_at, created_by)
             VALUES (:title, :code, :keywords, :about, :why, :symptoms, :dos, :donts,
                 :help, :source, :active, NOW(), :by)
             ON DUPLICATE KEY UPDATE
                code = VALUES(code), keywords = VALUES(keywords), about = VALUES(about),
                why_it_happens = VALUES(why_it_happens), common_symptoms = VALUES(common_symptoms),
                dos = VALUES(dos), donts = VALUES(donts), when_to_seek_help = VALUES(when_to_seek_help),
                source = VALUES(source), is_active = VALUES(is_active),
                updated_at = NOW(), updated_by = VALUES(created_by)"
        );
        $stmt->execute([
            'title' => $title,
            'code' => $code === '' ? null : $code,
            'keywords' => $text($data['keywords'] ?? null),
            'about' => $text($data['about'] ?? null),
            'why' => $text($data['why_it_happens'] ?? null),
            'symptoms' => $text($data['common_symptoms'] ?? null),
            'dos' => $text($data['dos'] ?? null),
            'donts' => $text($data['donts'] ?? null),
            'help' => $text($data['when_to_seek_help'] ?? null),
            'source' => $text($data['source'] ?? null),
            'active' => (int) ($data['is_active'] ?? 1) === 1 ? 1 : 0,
            'by' => $actorId,
        ]);

        return ['success' => true, 'message' => "Saved. Patients diagnosed with this will read it as “{$title}”."];
    }
}
