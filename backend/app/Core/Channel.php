<?php

namespace App\Core;

/**
 * Which client a request came from: the pharmacy tablet, the desktop HMS, or
 * a script.
 *
 * Why this exists: the tablet app and the desktop HMS post to the SAME
 * dispensing endpoints as the same user accounts, so until now a dispensing in
 * the database was indistinguishable from either. During the tablet pilot that
 * is the one question worth asking -- "which of these came from the tablet?" --
 * both to review it and to find its rows again if something goes wrong.
 *
 * IMPORTANT: this is a CLAIM made by the client, not proof. The header can be
 * set by anything that can reach the API, so it is fit for operational
 * attribution and useless as a security control. Nothing may be authorised on
 * it -- that is what the session and the role grants are for.
 */
class Channel
{
    public const TABLET = 'tablet';
    public const DESKTOP = 'desktop';
    public const CLI = 'cli';

    /** Clients allowed to name themselves through X-Client-Channel. */
    private const DECLARABLE = [self::TABLET, self::DESKTOP];

    /** Marker in the tablet's User-Agent, for when the header is stripped by a proxy. */
    private const TABLET_AGENT = 'USIntellixPharmacyTablet';

    public static function current(): string
    {
        $declared = strtolower(trim((string) ($_SERVER['HTTP_X_CLIENT_CHANNEL'] ?? '')));
        if (in_array($declared, self::DECLARABLE, true)) {
            return $declared;
        }

        $agent = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        if ($agent !== '' && stripos($agent, self::TABLET_AGENT) !== false) {
            return self::TABLET;
        }

        // No user agent and no web server means a CLI script or a cron job.
        return $agent === '' && !isset($_SERVER['REQUEST_METHOD']) ? self::CLI : self::DESKTOP;
    }

    /** "from the pharmacy tablet" -- for an audit description. */
    public static function describe(?string $channel = null): string
    {
        switch ($channel ?? self::current()) {
            case self::TABLET:  return 'from the pharmacy tablet';
            case self::CLI:     return 'from a server-side script';
            default:            return 'from the desktop HMS';
        }
    }
}
