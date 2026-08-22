export function generateCustomPatientReportHtml(patient, data, selections) {
    const safeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const dateGenerated = new Date().toISOString().split('T')[0];
    const name = `${safeHtml(patient.last_name || '')}, ${safeHtml(patient.first_name || '')}`.trim();
    const dob = patient.birthdate ? patient.birthdate.substring(0, 10) : '';

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Customized Medical History Report</title>
    <style>
        body { font-family: sans-serif; color: #000; font-size: 13px; line-height: 1.4; padding: 20px; }
        h1 { font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; }
        h2 { font-size: 20px; font-weight: bold; margin: 30px 0 15px 0; }
        h3 { font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; }
        hr { border: 0; border-bottom: 1px solid #000; margin: 20px 0; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-table td { padding: 4px; vertical-align: top; }
        .section-label { font-weight: normal; }
    </style>
</head>
<body>
    <div style="font-size: 12px; margin-bottom: 20px;">
        PATIENT:${name} - ${dob} Generated on ${dateGenerated} - John Radcliffe Hospital 0300 304 7777
    </div>

    <h1>John Radcliffe Hospital</h1>
    <div>
        Headley Way<br>
        Headington, Oxford OX3 9DU<br>
        0300 304 7777<br>
        <span style="color: blue; text-decoration: underline;">${safeHtml(patient.first_name)} ${safeHtml(patient.last_name)}</span><br>
        Generated on: ${dateGenerated}
    </div>

    <hr>
`;

    if (selections.includes('Demographics')) {
        html += `
    <h2>Patient Data:</h2>
    <table class="data-table">
        <tr>
            <td width="10%">Who</td>
            <td width="20%">Name:</td><td width="25%">${safeHtml(patient.first_name)} ${safeHtml(patient.last_name)}</td>
            <td width="20%">DOB:</td><td width="25%">${dob}</td>
        </tr>
        <tr>
            <td></td>
            <td>External ID:</td><td>${safeHtml(patient.patient_no || '1')}</td>
            <td>S.S.:</td><td>${safeHtml(patient.ssn || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td>Birth Sex:</td><td>${safeHtml(patient.sex || '')}</td>
            <td>Sex:</td><td>${safeHtml(patient.sex || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td>Marital Status:</td><td>${safeHtml(patient.marital_status || 'Single')}</td>
            <td></td><td></td>
        </tr>
        <tr>
            <td>Contact</td>
            <td>Address:</td><td>${safeHtml(patient.address_line || '')}</td>
            <td>City:</td><td>${safeHtml(patient.city || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td>State:</td><td>${safeHtml(patient.province || '')}</td>
            <td>Postal Code:</td><td>${safeHtml(patient.zip_code || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td>Country:</td><td>USA</td>
            <td>Mother's Name:</td><td></td>
        </tr>
        <tr>
            <td></td>
            <td>Emergency Contact:</td><td></td>
            <td>Emergency Phone:</td><td></td>
        </tr>
        <tr>
            <td></td>
            <td>Home Phone:</td><td>${safeHtml(patient.home_phone || '')}</td>
            <td>Work Phone:</td><td>${safeHtml(patient.work_phone || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td>Mobile Phone:</td><td>${safeHtml(patient.mobile_phone || '')}</td>
            <td>Contact Email:</td><td>${safeHtml(patient.email || '')}</td>
        </tr>
    </table>
    <hr>
`;
    }

    if (selections.includes('History')) {
        html += `<h2>History Data:</h2><hr>`;
    }
    if (selections.includes('Insurance')) {
        html += `<h2>Insurance Data:</h2><br>Primary Insurance Data:<hr>`;
    }
    if (selections.includes('Billing')) {
        html += `<h2>Billing Information:</h2><hr>`;
    }
    if (selections.includes('Immunizations')) {
        html += `<h2>Patient Immunization:</h2><hr>`;
    }
    if (selections.includes('Patient Notes')) {
        html += `<h2>Patient Notes:</h2><hr>`;
    }
    if (selections.includes('Transactions')) {
        html += `<h2>Patient Transactions:</h2><hr>`;
    }
    if (selections.includes('Communications')) {
        html += `<h2>Patient Communication sent:</h2><hr>`;
    }

    // Issues
    html += `<h2>Issues</h2>`;
    
    if (data.allergies && data.allergies.length > 0) {
        html += `<div>Allergies:<br>`;
        data.allergies.forEach(a => {
            html += `${safeHtml(a.title)}:<br>`;
        });
        html += `</div>`;
    }
    
    if (data.problems && data.problems.length > 0) {
        html += `<div>Medical Problems:<br>`;
        data.problems.forEach(p => {
            html += `${safeHtml(p.problem || p.title)}:<br>`;
        });
        html += `</div>`;
    }
    
    if (data.medications && data.medications.length > 0) {
        html += `<div>Medications:<br>`;
        data.medications.forEach(m => {
            html += `${safeHtml(m.medication || m.title)}:<br>`;
        });
        html += `</div>`;
    }

    // Encounters
    if (data.encounters && data.encounters.length > 0) {
        data.encounters.forEach(e => {
            const dateStr = e.date ? e.date.substring(0, 10) : '';
            html += `<h2>New Patient Encounter</h2>`;
            html += `<div>(${dateStr}) Provider: ${safeHtml(e.provider || '')}</div>`;
            html += `<h3>Office Visit</h3>`;
            html += `<div>Reason For Visit<br><br>()<br><br></div>`;
            
            // Add SOAP if present
            if (e.soap) {
                html += `<h2>SOAP</h2>`;
                html += `<div>(${dateStr})<br>Subjective: ${safeHtml(e.soap.subjective || '')}<br>Objective: ${safeHtml(e.soap.objective || '')}<br>Assessment: ${safeHtml(e.soap.assessment || '')}<br>Plan: ${safeHtml(e.soap.plan || '')}<br></div>`;
            }
            // Add Vitals if present
            if (e.vitals) {
                html += `<h2>Vitals</h2>`;
                html += `<div>(${dateStr})<br>Blood Pressure: ${safeHtml(e.vitals.blood_pressure || '')} Height: ${safeHtml(e.vitals.height || '')} Weight: ${safeHtml(e.vitals.weight || '')} Temperature: ${safeHtml(e.vitals.temperature || '')}<br></div>`;
            }
        });
    }

    html += `
</body>
</html>`;
    return html;
}
