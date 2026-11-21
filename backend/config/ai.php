<?php

use App\Core\Env;

/**
 * AI analysis credentials and model choice.
 *
 * Same shape as config/mail.php: the values live in backend/.env, which is
 * gitignored, and nothing outside this file reads them. See
 * docs/ai-analysis-roadmap.md AI-1 for how to obtain the key.
 *
 * The key is read here and nowhere else. If you find yourself wanting
 * Env::get('ANTHROPIC_API_KEY') somewhere in a module, take the config array
 * instead -- one reader is what makes "where could this leak from" answerable.
 */
return [
    // From platform.claude.com, Settings -> API keys. Begins "sk-ant-".
    // Belongs to the hospital's organisation, not to anybody's personal account.
    'api_key' => Env::get('ANTHROPIC_API_KEY', ''),

    // Claude Opus 5.5. Cheaper models exist under the same agreement
    // (claude-sonnet-5-5, claude-haiku-5-5); whether they are good enough for a
    // given report is a measurement, not an assumption, so the choice is a
    // setting rather than a constant.
    'model' => Env::get('AI_MODEL', 'claude-opus-5-5'),

    // Seconds. A report summary that has not come back in half a minute is a
    // failure the panel should show, not something to keep a staff member
    // waiting on.
    'timeout' => (int) Env::get('AI_TIMEOUT', 30),

    // Only set this to point at a gateway or a self-hosted model. Empty means
    // Anthropic's own endpoint.
    'base_url' => Env::get('AI_BASE_URL', ''),
];
