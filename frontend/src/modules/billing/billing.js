export function initBilling() {
    const form = document.getElementById("billingSummaryForm");
    if (!form) return;
    
    // Set default dates
    const today = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(today.getFullYear() - 1);
    
    const toInput = document.getElementById("billing_to");
    const fromInput = document.getElementById("billing_from");
    
    if (toInput) toInput.value = today.toISOString().split("T")[0];
    if (fromInput) fromInput.value = lastYear.toISOString().split("T")[0];
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const results = document.getElementById("billingResults");
        if (results) {
            results.innerHTML = `<div class="table-empty">No billing records found for the selected date range.</div>`;
        }
    });
}
