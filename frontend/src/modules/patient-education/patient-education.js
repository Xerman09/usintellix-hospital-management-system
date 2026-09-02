const RESOURCE_SEARCH_URLS = {
    emedicine: (q) => `https://emedicine.medscape.com/action/search?q=${q}`,
    medlineplus: (q) => `https://medlineplus.gov/search/?query=${q}`,
    familydoctor: (q) => `https://familydoctor.org/?s=${q}`,
    kidshealth: (q) => `https://kidshealth.org/en/search/?q=${q}`,
    medicinenet: (q) => `https://www.medicinenet.com/search.asp?query=${q}`,
    webmd: (q) => `https://www.webmd.com/search/search_results/default.aspx?query=${q}`,
    mayoclinic: (q) => `https://www.mayoclinic.org/search/search-results?q=${q}`,
    wikipedia: (q) => `https://en.wikipedia.org/w/index.php?search=${q}`,
    google: (q) => `https://www.google.com/search?q=${q}`
};

function handleSubmit(e) {
    e.preventDefault();

    const resource = document.getElementById("peResource")?.value;
    const searchInput = document.getElementById("peSearch");
    const term = searchInput?.value.trim();
    const instructionText = document.getElementById("peInstructionText");

    if (!term) {
        if (instructionText) {
            instructionText.style.color = "#e53e3e";
            instructionText.textContent = "Please enter a search term first.";
        }
        searchInput?.focus();
        return;
    }

    if (instructionText) {
        instructionText.style.color = "#2d3748";
        instructionText.textContent = "Please input search criteria above, and click Submit to view results. (Results will be displayed in a pop up window)";
    }

    const buildUrl = RESOURCE_SEARCH_URLS[resource];
    if (!buildUrl) return;

    const url = buildUrl(encodeURIComponent(term));
    window.open(url, "patient_education_popup", "width=900,height=700,resizable=yes,scrollbars=yes");
}

export function initPatientEducation() {
    const form = document.getElementById("peForm");
    if (form) {
        form.addEventListener("submit", handleSubmit);
    }
}
