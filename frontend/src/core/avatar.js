import { API_URL } from "./api.js";

/**
 * Build the markup for a user's avatar circle: their photo if they have
 * one uploaded, otherwise the first letter of their username.
 */
export function avatarHtml(user)
{
    if (user?.avatar) {
        return `<img src="${API_URL}${user.avatar}" alt="Avatar">`;
    }

    return (user?.username || "U").charAt(0).toUpperCase();
}

/**
 * Render a user's avatar into the given element.
 */
export function renderAvatar(el, user)
{
    if (!el) {
        return;
    }

    el.innerHTML = avatarHtml(user);
}
