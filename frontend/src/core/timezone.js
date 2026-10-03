import { API_URL } from "./api.js";

/*
 * The system timezone (Administration > General Settings > System
 * Timezone), applied on the frontend only.
 *
 * The browser's own clock and timezone can't be trusted to match the
 * hospital's -- a laptop set to another zone, or toISOString(), which
 * always answers in UTC and so gives yesterday's date before 8 AM in
 * Manila. Everything that needs "today" or "now" goes through here
 * instead, and gets the hospital's wall-clock time.
 *
 * systemNow() returns a Date whose *local* fields (getFullYear(),
 * getHours(), toLocaleString(), ...) read as the system timezone's wall
 * clock -- the same way the app already reads the naive "YYYY-MM-DD
 * HH:mm:ss" timestamps the server sends, so the two compare correctly.
 * It is for display, date inputs and date arithmetic only: never send
 * systemNow().toISOString() to the server as a real instant.
 */

const STORAGE_KEY = "system_timezone";
const DEFAULT_TIMEZONE = "Asia/Manila";

let timezone = readStored() || DEFAULT_TIMEZONE;

function readStored()
{
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored && isValidTimezone(stored) ? stored : null;
    } catch {
        return null;
    }
}

function isValidTimezone(name)
{
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: name });
        return true;
    } catch {
        return false;
    }
}

export function getSystemTimezone()
{
    return timezone;
}

/**
 * Switch to a timezone for this page and remember it for the next load
 * (also used right after an admin saves a new one).
 */
export function setSystemTimezone(name)
{
    if (!name || !isValidTimezone(name)) return;

    timezone = name;

    try {
        localStorage.setItem(STORAGE_KEY, name);
    } catch {
        // Private window / storage blocked: still applies for this page.
    }
}

/**
 * Refresh the system timezone from the server. Runs once at startup; the
 * remembered value is used meanwhile, so nothing has to wait for it.
 */
export async function initSystemTimezone()
{
    try {
        const response = await fetch(`${API_URL}/system-timezone`, { credentials: "include" });
        const result = await response.json();

        if (result?.success) {
            setSystemTimezone(result.data?.timezone);
        }
    } catch {
        // Offline / server down: keep the remembered timezone.
    }
}

/**
 * The wall-clock date and time of an instant (default: now) in the system
 * timezone, as numbers.
 */
export function systemParts(instant = new Date())
{
    const parts = {};

    new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(instant).forEach(({ type, value }) => {
        parts[type] = Number(value);
    });

    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second
    };
}

/**
 * "Now" in the system timezone, as a Date whose local fields read as the
 * system's wall clock (see the note at the top of this file).
 */
export function systemNow()
{
    const now = new Date();
    const p = systemParts(now);

    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, now.getMilliseconds());
}

/**
 * Today's date in the system timezone, "YYYY-MM-DD" (for date inputs and
 * API filters).
 */
export function todayISO()
{
    return toDateInput(systemNow());
}

/**
 * Now in the system timezone as "YYYY-MM-DD HH:mm:ss" -- the same shape
 * the server uses.
 */
export function nowDateTime()
{
    const d = systemNow();

    return `${toDateInput(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * "YYYY-MM-DD" from a Date's local fields -- unlike toISOString(), which
 * converts to UTC and can land on the previous or next day.
 */
export function toDateInput(date)
{
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * "YYYY-MM-DDTHH:mm" from a Date's local fields, for datetime-local inputs.
 */
export function toDateTimeInput(date)
{
    return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Show a real instant (an ISO timestamp with a "Z" or offset, or a Date
 * taken from the actual clock) as the system timezone's wall-clock time.
 */
export function formatInSystemTimezone(value, options = {})
{
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(undefined, { ...options, timeZone: timezone });
}

function pad(value)
{
    return String(value).padStart(2, "0");
}
