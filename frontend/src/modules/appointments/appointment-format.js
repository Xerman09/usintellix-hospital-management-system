export function formatApptDate(dateStr)
{
    if (!dateStr) return "-";

    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatApptTime(timeStr)
{
    if (!timeStr) return "-";

    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;

    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function statusLabel(status)
{
    return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

export function parseDateStr(dateStr)
{
    const [year, month, day] = dateStr.split("-").map(Number);

    return new Date(year, month - 1, day);
}

export function toDateStr(date)
{
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(dateStr, delta)
{
    const date = parseDateStr(dateStr);

    date.setDate(date.getDate() + delta);

    return toDateStr(date);
}

/** Sunday-based week start, matching the calendar grids' Sun-first columns. */
export function startOfWeek(dateStr)
{
    const date = parseDateStr(dateStr);

    date.setDate(date.getDate() - date.getDay());

    return toDateStr(date);
}

export function formatDayHeading(dateStr)
{
    return parseDateStr(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatWeekRangeLabel(startStr, endStr)
{
    const start = parseDateStr(startStr);
    const end = parseDateStr(endStr);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

    const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endLabel = sameMonth
        ? end.toLocaleDateString("en-US", { day: "numeric" })
        : end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

export function formatMonthLabel(year, month)
{
    return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
