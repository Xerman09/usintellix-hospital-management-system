export function generateCustomPatientReportHtml(patient, data, selections) {
    const safeHtml = (str) => {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const dateGenerated = new Date().toISOString().split('T')[0];
    const name = `${safeHtml(patient.last_name || '')}, ${safeHtml(patient.first_name || '')}`.trim();
    const dob = patient.birthdate ? patient.birthdate.substring(0, 10) : '';

    let html = `
<div class="custom-report-content">
    <style>
        .custom-report-content { font-family: sans-serif; color: #000; font-size: 13px; line-height: 1.4; padding: 20px; }
        .custom-report-content h1 { font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; }
        .custom-report-content h2 { font-size: 20px; font-weight: bold; margin: 30px 0 15px 0; }
        .custom-report-content h3 { font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; }
        .custom-report-content hr { border: 0; border-bottom: 1px dashed #000; margin: 20px 0; }
        .custom-report-content .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .custom-report-content .data-table td { padding: 4px; vertical-align: top; }
        .custom-report-content .section-label { font-weight: normal; }
    </style>

    <div style="font-size: 12px; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 8px;">
        PATIENT:${name} - ${dob} Generated on ${dateGenerated} - John Radcliffe Hospital 0300 304 7777
    </div>

    <h1>John Radcliffe Hospital</h1>
    <div>
        Headley Way<br>
        Headington, Oxford OX3 9DU<br>
        0300 304 7777<br>
        <span style="color: #dc2626; font-weight: bold;">${safeHtml(patient.first_name)} ${safeHtml(patient.last_name)}</span><br>
        Generated on: ${dateGenerated}
    </div>

    <hr>
`;

    if (selections.includes('Demographics')) {
        html += `
    <h2>Patient Data:</h2>
    <table class="data-table">
        <tr>
            <td width="10%" style="color: #16a34a; font-weight: bold;">Who</td>
            <td width="20%" style="font-weight: bold;">Name:</td><td width="25%" style="color: #dc2626;">${safeHtml(patient.first_name)} ${safeHtml(patient.last_name)}</td>
            <td width="20%" style="font-weight: bold;">DOB:</td><td width="25%" style="color: #dc2626;">${dob}</td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">External ID:</td><td style="color: #dc2626;">${safeHtml(patient.patient_no || '1')}</td>
            <td style="font-weight: bold;">S.S.:</td><td style="color: #dc2626;">${safeHtml(patient.ssn || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">Birth Sex:</td><td style="color: #dc2626;">${safeHtml(patient.sex || '')}</td>
            <td style="font-weight: bold;">Sex:</td><td style="color: #dc2626;">${safeHtml(patient.sex || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">Marital Status:</td><td style="color: #dc2626;">${safeHtml(patient.marital_status || 'Single')}</td>
            <td></td><td></td>
        </tr>
        <tr>
            <td style="color: #16a34a; font-weight: bold;">Contact</td>
            <td style="font-weight: bold;">Address:</td><td style="color: #dc2626;">${safeHtml(patient.address_line || '')}</td>
            <td style="font-weight: bold;">City:</td><td style="color: #dc2626;">${safeHtml(patient.city || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">State:</td><td style="color: #dc2626;">${safeHtml(patient.province || '')}</td>
            <td style="font-weight: bold;">Postal Code:</td><td style="color: #dc2626;">${safeHtml(patient.zip_code || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">Country:</td><td style="color: #dc2626;">USA</td>
            <td style="font-weight: bold;">Mother's Name:</td><td style="color: #dc2626;"></td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">Emergency Contact:</td><td style="color: #dc2626;"></td>
            <td style="font-weight: bold;">Emergency Phone:</td><td style="color: #dc2626;"></td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">Home Phone:</td><td style="color: #dc2626;">${safeHtml(patient.home_phone || '')}</td>
            <td style="font-weight: bold;">Work Phone:</td><td style="color: #dc2626;">${safeHtml(patient.work_phone || '')}</td>
        </tr>
        <tr>
            <td></td>
            <td style="font-weight: bold;">Mobile Phone:</td><td style="color: #dc2626;">${safeHtml(patient.mobile_phone || '')}</td>
            <td style="font-weight: bold;">Contact Email:</td><td style="color: #dc2626;">${safeHtml(patient.email || '')}</td>
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
        html += `<div><strong>Allergies:</strong><br>`;
        data.allergies.forEach(a => {
            html += `${safeHtml(a.title)}:<br>`;
        });
        html += `</div>`;
    }
    
    if (data.problems && data.problems.length > 0) {
        html += `<div><strong>Medical Problems:</strong><br>`;
        data.problems.forEach(p => {
            html += `<b>${safeHtml(p.problem || p.title)}:</b><br>[Diagnosis]<br>`;
        });
        html += `</div>`;
    }
    
    if (data.medications && data.medications.length > 0) {
        html += `<div><strong>Medications:</strong><br>`;
        data.medications.forEach(m => {
            html += `${safeHtml(m.medication || m.title)}:<br>`;
        });
        html += `</div>`;
    }

    html += `<hr>`;

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
                html += `<div>(${dateStr})<br><strong>Subjective:</strong> ${safeHtml(e.soap.subjective || '')}<br><strong>Objective:</strong> ${safeHtml(e.soap.objective || '')}<br><strong>Assessment:</strong> ${safeHtml(e.soap.assessment || '')}<br><strong>Plan:</strong> ${safeHtml(e.soap.plan || '')}<br></div>`;
            }
            // Add Vitals if present
            if (e.vitals) {
                html += `<h2>Vitals</h2>`;
                html += `<div>(${dateStr})<br><strong>Blood Pressure:</strong> ${safeHtml(e.vitals.blood_pressure || '')} <strong>Height:</strong> ${safeHtml(e.vitals.height || '')} <strong>Weight:</strong> ${safeHtml(e.vitals.weight || '')} <strong>Temperature:</strong> ${safeHtml(e.vitals.temperature || '')}<br></div>`;
            }
            html += `<hr>`;
        });
    }

    html += `
</div>`;
    return html;
}
