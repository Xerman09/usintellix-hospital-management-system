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
