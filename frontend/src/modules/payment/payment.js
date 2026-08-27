import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";

export async function initPayment() {
    console.log("Payment module initialized");
    
    const patientNo = getLastActivePatientChart();
    if (!patientNo || patientNo === "null") return;

    const tbody = document.querySelector(".payment-container tbody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="padding: 10px;">Loading...</td></tr>`;

    // patientNo is the custom patient identifier (e.g. P-100), not the DB ID. We must find the DB ID.
    const patientsRes = await api("/patients");
    if (!patientsRes.success) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 10px; color: red;">Failed to load patients.</td></tr>`;
        return;
    }
    const patient = patientsRes.data.find(p => p.patient_no === patientNo);
    if (!patient) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 10px; color: red;">Patient not found.</td></tr>`;
        return;
    }
    const patientId = patient.id;

    const res = await api(`/patient-ledger?patient_id=${patientId}&from=2000-01-01&to=2099-12-31`);
    if (!res.success) {
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 10px; color: red;">Failed to load data.</td></tr>`;
        return;
    }

    const rows = res.data.rows || [];
    
    const encountersMap = {};
    
    rows.forEach(row => {
        const encId = row.encounter_id;
        if (!encId) return; // Skip non-encounter related for simplicity, or handle unallocated
        
        if (!encountersMap[encId]) {
            encountersMap[encId] = {
                id: encId,
                date: row.entry_date ? row.entry_date.substring(0, 10) : (row.billed_date ? row.billed_date.substring(0, 10) : ''),
                totalCharge: 0,
                insurancePayment: 0,
                patientPayment: 0,
                coPayPaid: 0
            };
        }
        
        if (row.row_type === 'charge') {
            encountersMap[encId].totalCharge += row.charge;
        } else if (row.row_type === 'payment') {
            if (row.payor === 'Insurance') {
                encountersMap[encId].insurancePayment += row.payment;
            } else {
                encountersMap[encId].patientPayment += row.payment;
                if (row.description && row.description.includes('COPAY')) {
                    encountersMap[encId].coPayPaid += row.payment;
                }
            }
        }
    });

    let html = `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;">${new Date().toISOString().substring(0, 10)}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td style="padding: 10px;"><input type="number" step="0.01" class="pay-input" data-date="${new Date().toISOString().substring(0, 10)}" data-encounter-id="" style="width: 60px; padding: 3px; border: 1px solid #ccc; border-radius: 3px;" /></td>
        </tr>
    `;

    Object.values(encountersMap).forEach(enc => {
        const insBal = enc.totalCharge - enc.insurancePayment; // Simplistic balance
        const patBal = 0; // simplistic
        
        html += `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;">${enc.date}</td>
            <td>${enc.id}</td>
            <td>${enc.totalCharge ? enc.totalCharge.toFixed(2) : ''}</td>
            <td>${enc.insurancePayment ? enc.insurancePayment.toFixed(2) : ''}</td>
            <td>${enc.patientPayment ? enc.patientPayment.toFixed(2) : ''}</td>
            <td>${enc.coPayPaid ? (-enc.coPayPaid).toFixed(2) : ''}</td>
            <td>0.00</td>
            <td>${insBal > 0 ? insBal.toFixed(2) : ''}</td>
            <td>${patBal > 0 ? patBal.toFixed(2) : ''}</td>
            <td style="padding: 10px;"><input type="number" step="0.01" class="pay-input" data-date="${enc.date}" data-encounter-id="${enc.id}" style="width: 60px; padding: 3px; border: 1px solid #ccc; border-radius: 3px;" /></td>
        </tr>
        `;
    });

    if (Object.keys(encountersMap).length === 0) {
        html += `<tr><td colspan="10" style="padding: 10px; color: #666;">No outstanding encounters found.</td></tr>`;
    }

    tbody.innerHTML = html;

    // Attach listeners to update total
    const totalInput = document.querySelector(".payment-container input[readonly]");
    const payInputs = document.querySelectorAll(".payment-container .pay-input");
    
    payInputs.forEach(input => {
        input.addEventListener("input", () => {
            let total = 0;
            payInputs.forEach(inp => {
                const val = parseFloat(inp.value);
                if (!isNaN(val)) total += val;
            });
            if (totalInput) totalInput.value = total.toFixed(2);
        });
    });

    const generateBtn = document.getElementById("generateInvoiceBtn");
    if (generateBtn) {
        generateBtn.addEventListener("click", async () => {
            const todayStr = new Date().toISOString().substring(0, 10);
            const paymentsToProcess = [];
            
            payInputs.forEach(inp => {
                const val = parseFloat(inp.value);
                if (!isNaN(val) && val > 0) {
                    paymentsToProcess.push({
                        amount: val,
                        date: inp.getAttribute("data-date"),
                        encounter_id: inp.getAttribute("data-encounter-id")
                    });
                }
            });
            
            if (paymentsToProcess.length === 0) {
                alert("Please enter a payment amount.");
                return;
            }

            const paymentMethod = document.getElementById("paymentMethod")?.value || "Check Payment";
            const paymentRef = document.getElementById("paymentRef")?.value || "";
            const coverage = document.querySelector('input[name="coverage"]:checked')?.value || "insurance";
            
            // Validation and Confirmation dialogs
            for (const p of paymentsToProcess) {
                if (!p.encounter_id) {
                    const c = confirm("If patient has appointment click OK to create encounter otherwise, cancel this and then create an encounter for today visit.");
                    if (!c) return;
                    
                    // check if appointment exists today
                    const apptsRes = await api(`/appointments?patient_id=${patientId}&from=${todayStr}&to=${todayStr}`);
                    if (!apptsRes.success || !apptsRes.data || apptsRes.data.length === 0) {
                        alert("Sorry No Appointment is Fixed. No Encounter could be created.");
                        return;
                    }
                } else if (p.date < todayStr) {
                    const c = confirm("You are posting against an old encounter?");
                    if (!c) return;
                }
            }

            // Post payments
            for (const p of paymentsToProcess) {
                const body = {
                    patient_id: patientId,
                    payment_amount: p.amount,
                    payment_date: todayStr, // payment made today
                    payment_type: paymentMethod.toUpperCase(),
                    encounter_id: p.encounter_id ? parseInt(p.encounter_id, 10) : null,
                    payer_type: coverage,
                    notes: paymentRef
                };
                
                await api("/patient-ledger", {
                    method: "POST",
                    body: JSON.stringify(body)
                });
            }
            
            alert("Payment(s) successfully recorded.");
            // Reload the view
            initPayment();
        });
    }
}
