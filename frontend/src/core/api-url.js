/*
 * Where the backend lives.
 *
 * This used to be worked out twice (api.js and session.js) with the two copies
 * drifting apart, so it lives here now and both import it. It cannot live in
 * api.js itself: api.js imports session.js, so session.js importing api.js back
 * would be a cycle and API_URL would still be in its temporal dead zone when
 * session.js was evaluated.
 */

const PRODUCTION_API_URL = "https://ihs.dm3system.com/backend/public";

/**
 * True when the page is being served by a machine on this network rather than by
 * the live server: localhost, a loopback address, an .localhost/.test/.local name,
 * or a private LAN address (10.x, 192.168.x, 172.16-31.x).
 *
 * The LAN addresses matter: opening the app from a phone or another PC on the same
 * network uses the host machine's IP, and before this those hostnames fell through
 * to production -- so a local page silently read and wrote the live database.
 */
function isLocalHost(hostname)
{
    const h = (hostname || "").toLowerCase();

    if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]") {
        return true;
    }

    if (/\.(localhost|test|local)$/.test(h)) {
        return true;
    }

    return /^10\./.test(h)
        || /^192\.168\./.test(h)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

/**
 * The backend of the project folder this page was served from, e.g.
 * http://192.168.1.10/ims/usintellix-hospital-management-system/backend/public
 * for .../frontend/#/login. Falls back to the live server for any other host.
 */
function resolveApiUrl()
{
    if (!isLocalHost(window.location.hostname)) {
        return PRODUCTION_API_URL;
    }

    const frontendMarker = "/frontend";
    const path = window.location.pathname;
    const markerIndex = path.indexOf(frontendMarker);
    const projectBase = markerIndex !== -1 ? path.slice(0, markerIndex) : "";

    return `${window.location.origin}${projectBase}/backend/public`;
}

export const API_URL = resolveApiUrl();
