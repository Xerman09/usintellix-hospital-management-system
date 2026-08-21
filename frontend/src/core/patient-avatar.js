import { API_URL } from "./api.js";

/**
 * Build the markup for a patient's avatar circle: their uploaded photo if
 * they have one, otherwise the first letter of their first name.
 */
export function patientAvatarHtml(patient)
{
    const letter = (patient?.first_name || "?").charAt(0).toUpperCase();

    if (patient?.photo) {
        return `<img src="${API_URL}${patient.photo}" alt="${letter}" onerror="this.outerHTML='${letter}'">`;
    }

    return letter;
}
