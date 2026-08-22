import { getUser } from "../../core/session.js";
import { fetchHealthSummary } from "../health-records/health-records.service.js";
import { fetchProfile } from "../profile/profile.service.js";
import { generateCcdDetailedReportHtml } from "../patients/patients-list.js";
import { generateCustomPatientReportHtml } from "./custom-report-template.js";
import { fetchPatientDocuments } from "../patient-documents/patient-documents.service.js";

export function initReports() {
    const btnDownloadSummary = document.getElementById("btnDownloadSummary");
    const btnViewSummary = document.getElementById("btnViewSummary");
    const btnCustomizedHistory = document.getElementById("btnCustomizedHistory");
    const btnDownloadDocs = document.getElementById("btnDownloadDocs");
    const btnHelp = document.getElementById("btnHelp");

    if (btnDownloadSummary) {
        btnDownloadSummary.addEventListener("click", async () => {
            const originalText = btnDownloadSummary.innerHTML;
            btnDownloadSummary.innerHTML = "Downloading...";
            btnDownloadSummary.disabled = true;
            await generateSummary('download');
            btnDownloadSummary.innerHTML = originalText;
            btnDownloadSummary.disabled = false;
        });
    }
    
    if (btnViewSummary) {
        btnViewSummary.addEventListener("click", () => generateSummary('view'));
    }

    if (btnCustomizedHistory) {
        btnCustomizedHistory.addEventListener("click", () => openCustomizedReport());
    }
    
    const btnBackToReports = document.getElementById("btnBackToReports");
    if (btnBackToReports) {
        btnBackToReports.addEventListener("click", () => {
            document.querySelector('.reports-grid').style.display = 'grid';
            document.getElementById('customizedReportContainer').style.display = 'none';
        });
    }

    const customCheckAll = document.getElementById("customCheckAll");
    const customClearAll = document.getElementById("customClearAll");
    
    if (customCheckAll) {
        customCheckAll.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll('.cat-cb, .item-cb').forEach(cb => cb.checked = true);
        });
    }
    
    if (customClearAll) {
        customClearAll.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll('.cat-cb, .item-cb').forEach(cb => cb.checked = false);
        });
    }

    const btnCustomGenerate = document.getElementById("btnCustomGenerate");
    const btnCustomDownload = document.getElementById("btnCustomDownload");
    
    if (btnCustomGenerate) {
        btnCustomGenerate.addEventListener("click", () => generateCustomReport('view'));
    }
    if (btnCustomDownload) {
        btnCustomDownload.addEventListener("click", () => generateCustomReport('download'));
    }

    if (btnDownloadDocs) {
        btnDownloadDocs.addEventListener("click", () => openDownloadDocs());
    }

    const btnBackToReportsFromDocs = document.getElementById("btnBackToReportsFromDocs");
    if (btnBackToReportsFromDocs) {
        btnBackToReportsFromDocs.addEventListener("click", () => {
            document.querySelector('.reports-grid').style.display = 'grid';
            document.getElementById('downloadDocsContainer').style.display = 'none';
        });
    }

    const selectAllDocsMaster = document.getElementById("selectAllDocsMaster");
    if (selectAllDocsMaster) {
        selectAllDocsMaster.addEventListener("change", (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.cat-select-all, .doc-checkbox').forEach(cb => {
                cb.checked = isChecked;
            });
        });
    }

    const btnDownloadSelectedDocs = document.getElementById("btnDownloadSelectedDocs");
    if (btnDownloadSelectedDocs) {
        btnDownloadSelectedDocs.addEventListener("click", () => generateDocsZip());
    }

    if (btnHelp) {
        btnHelp.addEventListener("click", () => alert("Please contact support for assistance with medical reports."));
    }
}

let cachedHealthData = null;
let cachedProfileData = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchReportDataCached(userId) {
    const now = Date.now();
    if (cachedHealthData && cachedProfileData && (now - lastFetchTime < CACHE_DURATION_MS)) {
        return { healthData: cachedHealthData, profileData: cachedProfileData };
    }
    
    const [healthResult, profileResult] = await Promise.all([
        fetchHealthSummary(userId),
        fetchProfile()
    ]);
    
    if (healthResult.success && profileResult.success) {
        cachedHealthData = healthResult.data || {};
        cachedProfileData = profileResult.data || {};
        lastFetchTime = now;
        return { healthData: cachedHealthData, profileData: cachedProfileData };
    }
    
    throw new Error("Failed to load patient data");
}

async function openCustomizedReport() {
    const user = getUser();
    if (!user || !user.id) return;
    
    const btn = document.getElementById("btnCustomizedHistory");
    const originalText = btn.innerHTML;
    btn.innerHTML = "Loading...";
    btn.disabled = true;

    try {
        const { healthData, profileData } = await fetchReportDataCached(user.id);
        
        // Populate the profile data fallback if needed
        cachedProfileData = profileData.id ? profileData : user;
        
        populateCustomizedReport(healthData);
        
        document.querySelector('.reports-grid').style.display = 'none';
        document.getElementById('customizedReportContainer').style.display = 'block';
    } catch (e) {
        alert("Failed to load patient data for the report.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function populateCustomizedReport(data) {
    const issuesContainer = document.getElementById("customIssuesList");
    const encountersContainer = document.getElementById("customEncountersList");
    
    let issuesHtml = '';
    
    // Allergies
    if (data.allergies && data.allergies.length) {
        issuesHtml += '<div class="custom-section-header">Allergies</div>';
        data.allergies.forEach(a => {
            issuesHtml += `<div class="custom-item-row">
                <label><input type="checkbox" class="item-cb" data-type="allergies" data-id="${a.id}" checked> ${a.title}</label>
                <span>Active</span>
            </div>`;
        });
    }
    
    // Problems
    if (data.problems && data.problems.length) {
        issuesHtml += '<div class="custom-section-header">Medical Problems</div>';
        data.problems.forEach(p => {
            issuesHtml += `<div class="custom-item-row">
                <label><input type="checkbox" class="item-cb" data-type="problems" data-id="${p.id}" checked> ${p.problem || p.title}</label>
                <span>Active</span>
            </div>`;
        });
    }
    
    // Medications
    if (data.medications && data.medications.length) {
        issuesHtml += '<div class="custom-section-header">Medications</div>';
        data.medications.forEach(m => {
            issuesHtml += `<div class="custom-item-row">
                <label><input type="checkbox" class="item-cb" data-type="medications" data-id="${m.id}" checked> ${m.medication || m.title}</label>
                <span>Active</span>
            </div>`;
        });
    }
    
    issuesContainer.innerHTML = issuesHtml || '<div style="color: #64748b; font-size: 12px; font-style: italic;">No active issues found.</div>';
    
    let encountersHtml = '';
    if (data.encounters && data.encounters.length) {
        data.encounters.forEach(e => {
            const d = e.date ? e.date.substring(0, 10) : '';
            encountersHtml += `<div class="custom-item-row" style="border: none;">
                <label><input type="checkbox" class="item-cb" data-type="encounters" data-id="${e.id}" checked> ${e.reason || 'Encounter'} (${d})</label>
            </div>`;
        });
    }
    
    encountersContainer.innerHTML = encountersHtml || '<div style="color: #64748b; font-size: 12px; font-style: italic;">No encounters found.</div>';
}

async function generateSummary(action) {
    const user = getUser();
    if (!user || !user.id) return;
    
    let reportWindow = null;
    if (action === 'view') {
        // 1. Open synchronously BEFORE fetching for view
        reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
        if (!reportWindow) {
            alert("Please enable pop-ups to view the report.");
            return;
        }

        // 2. Write a loading state immediately
        reportWindow.document.open();
        reportWindow.document.write(`
            <!DOCTYPE html><html><head><title>Loading Report...</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; color: #555;">
                <h2>Generating Summary of Care...</h2><p>Please wait.</p>
            </body></html>
        `);
    }
    // 3. Perform the asynchronous fetches
    try {
        const { healthData, profileData } = await fetchReportDataCached(user.id);
        
        // 5. Generate the final HTML using the admin CCR template
        const fullPatientData = profileData.id ? profileData : user;
        const html = generateCcdDetailedReportHtml(fullPatientData, healthData);
        
        if (action === 'view' && reportWindow) {
            reportWindow.document.open();
            reportWindow.document.write(html);
            reportWindow.document.close();
        } else if (action === 'download') {
            // Download as HTML file
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            const dateStr = new Date().toISOString().split('T')[0];
            const safeName = (user.first_name || 'Patient') + '_' + (user.last_name || '');
            
            a.href = url;
            a.download = `Summary_Of_Care_${safeName}_${dateStr}.html`.replace(/[^a-zA-Z0-9_.-]/g, '');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (e) {
        if (action === 'view' && reportWindow) {
            reportWindow.document.open();
            reportWindow.document.write(`<h2 style="font-family: sans-serif; color: #d92d20; padding: 40px; text-align: center;">Failed to load data.</h2>`);
            reportWindow.document.close();
        } else {
            alert("Failed to load data.");
        }
    }
}

function generateCustomReport(action) {
    if (!cachedProfileData || !cachedHealthData) return;
    
    // Check which categories are selected
    const selectedCats = Array.from(document.querySelectorAll('.cat-cb:checked')).map(cb => cb.value);
    
    // Check which specific items are selected
    const selectedItems = {
        allergies: new Set(),
        problems: new Set(),
        medications: new Set(),
        encounters: new Set()
    };
    
    document.querySelectorAll('.item-cb:checked').forEach(cb => {
        selectedItems[cb.dataset.type].add(Number(cb.dataset.id));
    });
    
    // Filter the health data based on selection
    const filteredData = {
        allergies: (cachedHealthData.allergies || []).filter(a => selectedCats.includes('Allergies') && selectedItems.allergies.has(Number(a.id))),
        problems: (cachedHealthData.problems || []).filter(p => selectedCats.includes('Medical Problems') && selectedItems.problems.has(Number(p.id))),
        medications: (cachedHealthData.medications || []).filter(m => selectedCats.includes('Medications') && selectedItems.medications.has(Number(m.id))),
        encounters: (cachedHealthData.encounters || []).filter(e => selectedItems.encounters.has(Number(e.id))),
        immunizations: selectedCats.includes('Immunizations') ? cachedHealthData.immunizations : []
    };
    
    // Build patient data based on Demographics check
    let patientDataForReport = cachedProfileData;
    if (!selectedCats.includes('Demographics')) {
        patientDataForReport = {
            id: cachedProfileData.id,
            patient_no: cachedProfileData.patient_no,
            first_name: 'REDACTED',
            last_name: 'REDACTED'
        };
    }
    
    const html = generateCustomPatientReportHtml(patientDataForReport, filteredData, selectedCats);
    
    if (action === 'view') {
        const modal = document.getElementById("customReportModal");
        const modalBody = document.getElementById("customReportModalBody");
        const btnClose = document.getElementById("btnCloseCustomReportModal");
        const btnPrint = document.getElementById("btnModalPrintableVersion");
        
        if (modal && modalBody) {
            modalBody.innerHTML = html;
            modal.style.display = 'flex';
            
            if (btnClose) {
                btnClose.onclick = () => { modal.style.display = 'none'; };
            }
            if (btnPrint) {
                btnPrint.onclick = () => { generateCustomReport('download'); };
            }
        } else {
            // Fallback
            const reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
            if (reportWindow) {
                reportWindow.document.open();
                reportWindow.document.write(html);
                reportWindow.document.close();
            } else {
                alert("Please enable pop-ups to view the report.");
            }
        }
    } else if (action === 'download') {
        // Download as PDF via print dialog
        const reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
        if (reportWindow) {
            reportWindow.document.open();
            reportWindow.document.write(html);
            reportWindow.document.write(`<script>
                window.onload = function() { 
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>`);
            reportWindow.document.close();
        } else {
            alert("Please enable pop-ups to download the report.");
        }
    }
}

let cachedDocs = null;

async function openDownloadDocs() {
    const user = getUser();
    if (!user || !user.id) return;
    
    const btn = document.getElementById("btnDownloadDocs");
    const originalText = btn.innerHTML;
    btn.innerHTML = "Loading...";
    btn.disabled = true;

    try {
        const result = await fetchPatientDocuments(user.id);
        if (result.success) {
            cachedDocs = result.data || [];
            
            // Group by category
            const grouped = cachedDocs.reduce((acc, doc) => {
                const cat = doc.category || "Uncategorized";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(doc);
                return acc;
            }, {});
            
            const grid = document.getElementById("docsCategoriesGrid");
            let html = '';
            
            Object.keys(grouped).forEach((cat, index) => {
                html += `
                <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 16px; background: #f8fafc;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px;">
                        <h4 style="margin: 0; font-size: 14px; font-weight: 500;">${cat}/</h4>
                        <label style="font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                            <input type="checkbox" class="cat-select-all" data-target="cat-group-${index}"> Select All
                        </label>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;" class="cat-group-${index}">
                `;
                
                grouped[cat].forEach(doc => {
                    html += `
                        <label style="font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" class="doc-checkbox" data-url="${doc.file_path}" data-name="${doc.file_name}">
                            ${doc.file_name}
                        </label>
                    `;
                });
                
                html += `</div></div>`;
            });
            
            grid.innerHTML = html || '<div style="font-size: 14px; color: #64748b;">No documents found.</div>';
            
            // Wire up category select alls
            document.querySelectorAll('.cat-select-all').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    const groupClass = e.target.getAttribute('data-target');
                    document.querySelectorAll('.' + groupClass + ' .doc-checkbox').forEach(docCb => {
                        docCb.checked = isChecked;
                    });
                });
            });
            
            document.querySelector('.reports-grid').style.display = 'none';
            document.getElementById('downloadDocsContainer').style.display = 'block';
        } else {
            alert("Failed to load documents.");
        }
    } catch (e) {
        alert("Error fetching documents.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function generateDocsZip() {
    const selectedCbs = Array.from(document.querySelectorAll('.doc-checkbox:checked'));
    if (selectedCbs.length === 0) {
        alert("Please select at least one document to download.");
        return;
    }
    
    if (typeof JSZip === 'undefined') {
        alert("JSZip library failed to load. Cannot generate ZIP file.");
        return;
    }

    const btn = document.getElementById("btnDownloadSelectedDocs");
    const originalText = btn.innerHTML;
    btn.innerHTML = "Zipping Files...";
    btn.disabled = true;

    try {
        const zip = new JSZip();
        const API_URL = window.location.origin.includes('localhost') ? 'http://localhost/usintellix-hospital-management-system/backend' : '';
        
        // Fetch all selected files
        const fetchPromises = selectedCbs.map(async (cb) => {
            const fileUrl = API_URL + cb.dataset.url;
            const fileName = cb.dataset.name;
            
            try {
                const response = await fetch(fileUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    zip.file(fileName, blob);
                } else {
                    console.error("Failed to fetch file:", fileUrl);
                }
            } catch (err) {
                console.error("Error fetching file:", fileUrl, err);
            }
        });
        
        await Promise.all(fetchPromises);
        
        const zipContent = await zip.generateAsync({ type: "blob" });
        
        // Trigger download
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        const user = getUser();
        const dateStr = new Date().toISOString().split('T')[0];
        const safeName = (user.first_name || 'Patient') + '_' + (user.last_name || '');
        
        a.download = `Medical_Records_${safeName}_${dateStr}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (e) {
        console.error(e);
        alert("An error occurred while creating the zip file.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
