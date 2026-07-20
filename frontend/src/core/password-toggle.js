const EYE_OPEN = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

const EYE_CLOSED = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.62 21.62 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.62 21.62 0 0 1-3.22 4.53M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

/**
 * Wrap every password input on the page with a show/hide toggle button.
 */
export function enablePasswordToggles(root = document)
{
    const inputs = root.querySelectorAll('input[type="password"]:not([data-toggle-ready])');

    inputs.forEach((input) => {
        input.setAttribute("data-toggle-ready", "true");

        const wrapper = document.createElement("div");
        wrapper.className = "password-field";

        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "password-toggle";
        toggle.setAttribute("aria-label", "Show password");
        toggle.innerHTML = EYE_OPEN;

        wrapper.appendChild(toggle);

        toggle.addEventListener("click", () => {
            const isPassword = input.type === "password";

            input.type = isPassword ? "text" : "password";
            toggle.innerHTML = isPassword ? EYE_CLOSED : EYE_OPEN;
            toggle.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        });
    });
}
