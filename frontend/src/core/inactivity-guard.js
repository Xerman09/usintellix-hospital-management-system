import { api } from "./api.js";
import { isAuthenticated, clearSession } from "./session.js";

const TOTAL_TIMEOUT_MS = 15 * 60 * 1000;      // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000;          // Show warning 60 seconds before
const WARNING_TIMEOUT_MS = TOTAL_TIMEOUT_MS - WARNING_BEFORE_MS; // 14 minutes

let warningTimer = null;
let logoutTimer = null;
let countdownInterval = null;
let isWarningActive = false;
let isInitialized = false;

/**
 * Initializes the HIPAA Automatic Logoff watchdog (§ 164.312(a)(2)(iii)).
 */
export function initInactivityGuard()
{
    if (isInitialized) {
        return;
    }
    isInitialized = true;

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    
    let debounceTimeout = null;
    const onUserActivity = () => {
        // If warning dialog is already showing, activity alone does not dismiss it;
        // user must explicitly click "Continue Working".
        if (isWarningActive) {
            return;
        }

        if (!isAuthenticated()) {
            stopInactivityGuard();
            return;
        }

        if (!debounceTimeout) {
            debounceTimeout = setTimeout(() => {
                resetInactivityTimer();
                debounceTimeout = null;
            }, 1000);
        }
    };

    activityEvents.forEach((event) => {
        window.addEventListener(event, onUserActivity, { passive: true });
    });

    // Hash change / route change check
    window.addEventListener("hashchange", () => {
        if (!isAuthenticated() || window.location.hash.startsWith("#/login")) {
            stopInactivityGuard();
        } else {
            resetInactivityTimer();
        }
    });

    if (isAuthenticated() && !window.location.hash.startsWith("#/login")) {
        resetInactivityTimer();
    }
}

/**
 * Resets the inactivity countdown timer.
 */
export function resetInactivityTimer()
{
    stopInactivityTimers();

    if (!isAuthenticated() || window.location.hash.startsWith("#/login")) {
        return;
    }

    warningTimer = setTimeout(() => {
        showWarningModal();
    }, WARNING_TIMEOUT_MS);
}

/**
 * Halts all running timers and cleans up any open warning dialogs.
 */
export function stopInactivityGuard()
{
    stopInactivityTimers();
    dismissWarningModal();
}

function stopInactivityTimers()
{
    if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
    }
    if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
    }
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

/**
 * Displays the 60-second warning modal.
 */
function showWarningModal()
{
    isWarningActive = true;
    let remainingSeconds = Math.floor(WARNING_BEFORE_MS / 1000);

    // Build modal markup
    let modalEl = document.getElementById("hipaaInactivityModal");
    if (!modalEl) {
        modalEl = document.createElement("div");
        modalEl.id = "hipaaInactivityModal";
        modalEl.className = "hipaa-inactivity-backdrop";
        modalEl.innerHTML = `
            <div class="hipaa-inactivity-dialog" role="alertdialog" aria-modal="true" aria-labelledby="hipaaModalTitle">
                <div class="hipaa-modal-header">
                    <span class="hipaa-shield-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </span>
                    <h2 id="hipaaModalTitle">Session Inactivity Warning</h2>
                </div>
                <div class="hipaa-modal-body">
                    <p>For your security and HIPAA compliance (&sect; 164.312(a)(2)(iii)), your session will automatically terminate due to inactivity in:</p>
                    <div class="hipaa-countdown-wrapper">
                        <span id="hipaaCountdownSeconds" class="hipaa-countdown-number">${remainingSeconds}</span>
                        <span class="hipaa-countdown-unit">seconds</span>
                    </div>
                    <p class="hipaa-modal-subtext">Click <strong>Continue Working</strong> to extend your active session, or log out now.</p>
                </div>
                <div class="hipaa-modal-actions">
                    <button id="hipaaLogoutNowBtn" class="btn btn-secondary">Log Out Now</button>
                    <button id="hipaaKeepAliveBtn" class="btn btn-primary">Continue Working</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);

        // Bind events
        document.getElementById("hipaaLogoutNowBtn").addEventListener("click", () => {
            performInactivityLogout();
        });

        document.getElementById("hipaaKeepAliveBtn").addEventListener("click", async () => {
            dismissWarningModal();
            try {
                // Heartbeat ping to server to touch backend session
                await api("/ping");
            } catch (e) {
                // Ignore failure, timer is reset
            }
            resetInactivityTimer();
        });
    } else {
        const countSpan = document.getElementById("hipaaCountdownSeconds");
        if (countSpan) {
            countSpan.textContent = String(remainingSeconds);
        }
        modalEl.style.display = "flex";
    }

    // Live countdown
    countdownInterval = setInterval(() => {
        remainingSeconds -= 1;
        const countSpan = document.getElementById("hipaaCountdownSeconds");
        if (countSpan) {
            countSpan.textContent = String(Math.max(0, remainingSeconds));
        }

        if (remainingSeconds <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            performInactivityLogout();
        }
    }, 1000);
}

function dismissWarningModal()
{
    isWarningActive = false;
    const modalEl = document.getElementById("hipaaInactivityModal");
    if (modalEl) {
        modalEl.style.display = "none";
    }
}

/**
 * Performs HIPAA mandated automatic session termination.
 */
async function performInactivityLogout()
{
    stopInactivityTimers();
    dismissWarningModal();

    try {
        await api("/logout", { method: "POST" });
    } catch (err) {
        // Continue even if network fails
    }

    clearSession();
    window.location.hash = "#/login?reason=inactivity";
}
