let container = null;

function ensureContainer()
{
    if (container && document.body.contains(container)) {
        return container;
    }

    container = document.createElement("div");
    container.className = "app-toast-container";
    document.body.appendChild(container);

    return container;
}

const ICONS = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 16h.01"></path></svg>`
};

export function showToast(message, type = "success", duration = 3500)
{
    const toast = document.createElement("div");

    toast.className = `app-toast ${type}`;
    toast.innerHTML = `
        <span class="app-toast-icon">${ICONS[type] || ICONS.success}</span>
        <span class="app-toast-message"></span>
        <button type="button" class="app-toast-close" aria-label="Dismiss">&times;</button>
        <span class="app-toast-progress" style="--toast-duration: ${duration}ms"></span>
    `;

    toast.querySelector(".app-toast-message").textContent = message;

    ensureContainer().appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    const dismiss = () => {
        toast.classList.remove("show");
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 250);
    };

    const timer = setTimeout(dismiss, duration);

    toast.querySelector(".app-toast-close").addEventListener("click", () => {
        clearTimeout(timer);
        dismiss();
    });
}
