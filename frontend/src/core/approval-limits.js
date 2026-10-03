import { getUser } from "./session.js";

/*
 * Approval limits by amount (General Settings > Approval Limits). Above
 * a document's limit an accountant's approval is only the first one and
 * an administrator gives the final approval. The backend decides; these
 * helpers only word it for the screens.
 */

const peso = (value) => "₱" + Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function when(value) {
    if (!value) return "";
    const date = new Date(String(value).replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Whether the signed-in user's approval would only be the first one. */
export function isFirstLevelOnly(doc) {
    return !!doc?.needs_admin_approval && getUser()?.role !== "admin" && !doc.first_approved_by;
}

/**
 * One line (HTML) for a pending document above its limit, or "".
 * doc: { status, needs_admin_approval, approval_limit, first_approved_at, first_approved_by_name, first_approval_notes }
 */
export function limitNote(doc) {
    if (!doc?.needs_admin_approval || doc.status !== "pending_approval") return "";

    const limit = `above the ${peso(doc.approval_limit)} approval limit`;

    if (doc.first_approved_at) {
        return `<span class="approval-limit-note">First approval by <strong>${esc(doc.first_approved_by_name || "an approver")}</strong> on ${esc(when(doc.first_approved_at))}${doc.first_approval_notes ? ` &mdash; &ldquo;${esc(doc.first_approval_notes)}&rdquo;` : ""}. It's ${limit}, so an administrator gives the final approval.</span>`;
    }

    return `<span class="approval-limit-note">It's ${limit}: an accountant's approval counts as the first one, then an administrator gives the final approval (an administrator alone covers both).</span>`;
}
