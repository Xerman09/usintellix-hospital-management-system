import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { api, API_URL } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

let categoriesList = [];
let currentDocuments = [];
let patientsList = [];
let selectedPatientId = 'unassigned';
let selectedCategoryName = null;
let activeDocument = null;
let collapsedCategories = new Set();
let allCollapsed = false;

export async function initNewDocuments() {
    setupTopbarControls();
    await loadPatientsList();
    await refreshAll();
}

function setupTopbarControls() {
    const patientSelect = document.getElementById("ndPatientSelect");
    const unassignedBtn = document.getElementById("ndUnassignedBtn");
    const uploadTrigger = document.getElementById("ndNewUploadTriggerBtn");

    if (patientSelect) {
        patientSelect.onchange = async () => {
            selectedPatientId = patientSelect.value;
            activeDocument = null;
            await refreshDocumentsAndTree();
            renderUploader(selectedCategoryName);
        };
    }

    if (unassignedBtn) {
        unassignedBtn.onclick = async () => {
            if (patientSelect) patientSelect.value = 'unassigned';
            selectedPatientId = 'unassigned';
            activeDocument = null;
            await refreshDocumentsAndTree();
            renderUploader();
        };
    }

    if (uploadTrigger) {
        uploadTrigger.onclick = () => {
            renderUploader(selectedCategoryName);
        };
    }
}

async function loadPatientsList() {
    const select = document.getElementById("ndPatientSelect");
    if (!select) return;

    try {
        const res = await api('/patients?per_page=100');
        if (res.success && res.data) {
            patientsList = res.data.data || res.data || [];
            
            // Re-render select options
            const currentVal = select.value;
            select.innerHTML = `
                <option value="unassigned">New Document Uploads.</option>
                <option value="all">-- All Patients / Clinic Records --</option>
                <optgroup label="Patients">
                    ${patientsList.map(p => `
                        <option value="${p.id}">${escapeHtml(p.first_name || '')} ${escapeHtml(p.last_name || '')} (${escapeHtml(p.patient_no || 'ID-' + p.id)})</option>
                    `).join('')}
                </optgroup>
            `;

            // If active patient exists in chart, preselect them if appropriate
            const activeChart = getLastActivePatientChart();
            if (activeChart) {
                const found = patientsList.find(p => p.patient_no === activeChart);
                if (found && currentVal !== 'unassigned') {
                    select.value = String(found.id);
                    selectedPatientId = String(found.id);
                } else {
                    select.value = currentVal || 'unassigned';
                }
            } else {
                select.value = currentVal || 'unassigned';
            }
        }
    } catch (e) {
        console.error("Failed to load patients list", e);
    }
}

async function refreshAll() {
    await updateStats();
    await refreshDocumentsAndTree();
    
    // Default right panel to uploader
    if (!activeDocument) {
        renderUploader();
    }
}

async function updateStats() {
    try {
        const res = await api('/new-documents/stats');
        if (res.success && res.data) {
            const countEl = document.getElementById("ndUnassignedBadgeCount");
            if (countEl) {
                countEl.textContent = res.data.unassigned_count ?? 0;
            }
        }
    } catch (e) {
        console.error("Failed to update stats", e);
    }
}

async function refreshDocumentsAndTree() {
    try {
        // Fetch categories with counts
        const catRes = await api(`/new-documents/categories?patient_id=${selectedPatientId}`);
        if (catRes.success) {
            categoriesList = catRes.data || [];
        }

        // Fetch documents
        const docRes = await api(`/new-documents/documents?patient_id=${selectedPatientId}`);
        if (docRes.success) {
            currentDocuments = docRes.data || [];
        }

        renderTree();
    } catch (e) {
        console.error("Error refreshing documents & tree", e);
    }
}

function renderTree() {
    const container = document.getElementById("ndTreeContainer");
    if (!container) return;

    // Group documents by category
    const docsByCategory = {};
    currentDocuments.forEach(doc => {
        const cat = doc.category || 'Medical Record';
        if (!docsByCategory[cat]) docsByCategory[cat] = [];
        docsByCategory[cat].push(doc);
    });

    // Categories root with Toggle All
    const rootLabel = allCollapsed ? "Categories (Expand all)" : "Categories (Collapse all)";

    let html = `
        <div class="nd-tree-node">
            <div class="nd-tree-row" id="ndToggleRootCategories" style="font-weight: 600;">
                <span class="nd-tree-toggle">${allCollapsed ? '&#9654;' : '&#9660;'}</span>
                <i class="fas fa-folder-open nd-tree-folder-icon"></i>
                <span style="color: #0284c7; text-decoration: underline; font-style: italic;">${rootLabel}</span>
            </div>
            <div class="nd-tree-children" id="ndRootChildren" style="${allCollapsed ? 'display: none;' : ''}">
    `;

    // Filter root category and list standard subcategories (handling string or numeric parent_id)
    const topCategories = categoriesList.filter(c => c.name !== 'Categories' && (!c.parent_id || Number(c.parent_id) === 1 || c.parent_id == 1));

    // Ensure any category with documents is present in tree
    Object.keys(docsByCategory).forEach(catName => {
        if (!topCategories.some(c => c.name.toLowerCase() === catName.toLowerCase()) && catName !== 'Categories') {
            topCategories.push({ id: 999, parent_id: 1, name: catName, doc_count: docsByCategory[catName].length });
        }
    });

    topCategories.forEach(cat => {
        const catDocs = docsByCategory[cat.name] || [];
        const isCollapsed = collapsedCategories.has(cat.name);
        const hasChildren = catDocs.length > 0;
        const toggleIcon = hasChildren ? (isCollapsed ? '&#9654;' : '&#9660;') : '&bull;';
        const isSelected = selectedCategoryName === cat.name;

        html += `
            <div class="nd-tree-node" data-category="${escapeHtml(cat.name)}">
                <div class="nd-tree-row ${isSelected ? 'active' : ''}" data-action="select-category" data-cat-name="${escapeHtml(cat.name)}">
                    <span class="nd-tree-toggle" data-action="toggle-cat" data-cat-name="${escapeHtml(cat.name)}">${toggleIcon}</span>
                    <i class="fas ${isCollapsed ? 'fa-folder' : 'fa-folder-open'} nd-tree-folder-icon"></i>
                    <span class="nd-tree-cat-name">${escapeHtml(cat.name)}</span>
                    <span class="nd-tree-badge">(${catDocs.length})</span>
                </div>
                <div class="nd-tree-children" style="${isCollapsed ? 'display: none;' : ''}">
                    ${catDocs.map(doc => {
                        const isDocActive = activeDocument && activeDocument.id === doc.id;
                        const icon = getFileIcon(doc.mime_type, doc.original_filename);
                        return `
                            <div class="nd-doc-item ${isDocActive ? 'active' : ''}" data-action="select-doc" data-doc-id="${doc.id}">
                                <i class="${icon} nd-doc-icon"></i>
                                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${escapeHtml(doc.title || doc.original_filename)}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
    bindTreeEvents(container);
}

function bindTreeEvents(container) {
    // Root Toggle
    const rootBtn = container.querySelector("#ndToggleRootCategories");
    if (rootBtn) {
        rootBtn.onclick = () => {
            allCollapsed = !allCollapsed;
            if (allCollapsed) {
                categoriesList.forEach(c => collapsedCategories.add(c.name));
            } else {
                collapsedCategories.clear();
            }
            renderTree();
        };
    }

    // Category click / toggle
    container.querySelectorAll('[data-action="toggle-cat"]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const cat = btn.dataset.catName;
            if (collapsedCategories.has(cat)) {
                collapsedCategories.delete(cat);
            } else {
                collapsedCategories.add(cat);
            }
            renderTree();
        };
    });

    container.querySelectorAll('[data-action="select-category"]').forEach(row => {
        row.onclick = () => {
            const cat = row.dataset.catName;
            selectedCategoryName = cat;
            renderTree();
            renderUploader(cat);
        };
    });

    // Document item click
    container.querySelectorAll('[data-action="select-doc"]').forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            const docId = Number(item.dataset.docId);
            const doc = currentDocuments.find(d => d.id === docId);
            if (doc) {
                activeDocument = doc;
                selectedCategoryName = doc.category;
                renderTree();
                renderViewer(doc);
            }
        };
    });
}

function renderUploader(preselectedCategory = null) {
    const container = document.getElementById("ndViewerContainer");
    if (!container) return;

    activeDocument = null;
    const defaultCat = preselectedCategory || selectedCategoryName || 'Advance Directive';
    selectedCategoryName = defaultCat;

    container.innerHTML = `
        <div class="nd-emr-uploader-container">
            <div class="nd-notice-red">
                IMPORTANT: This upload tool is only for uploading documents on patients that are not yet entered into the system. To upload files for patients whom already have been entered into the system, please use the upload tool linked within the Patient Summary screen.
            </div>
            <div class="nd-notice-black">
                NOTE: Uploading files with duplicate names will cause the files to be automatically renamed (for example, file.jpg will become file.1.jpg). Filenames are considered unique per patient, not per category.
            </div>

            <div class="nd-target-category-title">
                Upload Document to category '<strong>${escapeHtml(defaultCat)}</strong>'
            </div>
            <div class="nd-target-category-subtitle">
                (Multiple files can be uploaded at one time by selecting them using CTRL+Click or SHIFT+Click.)
            </div>

            <form id="ndEmrUploadForm">
                <label class="nd-source-label" for="ndSourceFileInput">Source File Path:</label>
                <div class="nd-file-row">
                    <input type="file" id="ndSourceFileInput" multiple>
                </div>

                <label class="nd-source-label" style="font-weight: normal; font-size: 13px;" for="ndZipDirInput">
                    (Click below to Zip a Directory of image slices.)
                </label>
                <div class="nd-file-row">
                    <input type="file" id="ndZipDirInput" webkitdirectory directory multiple>
                </div>

                <input type="text" class="nd-dicom-input" id="ndDicomStudyInput" placeholder="Optional Destination or Dicom Study Name">

                <div style="margin-bottom: 16px;">
                    <button type="submit" class="nd-upload-btn-blue" id="ndUploadBtn">Upload</button>
                </div>
            </form>

            <!-- Large Drag and Drop Zone matching screenshot -->
            <div class="nd-emr-dropzone" id="ndEmrDropzone">
                <span id="ndEmrDropzoneText">Drop files here to upload</span>
            </div>

            <!-- Bottom Toolbar matching screenshot -->
            <div class="nd-emr-bottom-toolbar">
                <div class="nd-toolbar-group-left">
                    <div class="nd-toolbar-label">Download document template for this patient and visit</div>
                    <div class="nd-fetch-row">
                        <button type="button" class="nd-btn-fetch" id="ndFetchTemplateBtn">
                            <i class="fas fa-download"></i> Fetch
                        </button>
                        <select class="nd-select-template" id="ndTemplateSelect">
                            <option value="">-- Select Template --</option>
                        </select>
                    </div>
                </div>

                <div class="nd-toolbar-group-right">
                    <div class="nd-toolbar-label">Patient Document Template Forms</div>
                    <div style="display: flex; gap: 8px; position: relative;">
                        <button type="button" class="nd-btn-white-blue" id="ndOpenPatientTemplateBtn">
                            Open Patient Template &#x25BE;
                        </button>
                        <div id="ndTemplateMenuDropdown" style="display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 6px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 280px; z-index: 1000; padding: 6px 0;"></div>
                        <button type="button" class="nd-uploads-badge-btn" id="ndOpenModuleBtn">or Open Module</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupUploaderEvents(container, defaultCat);
}

function setupUploaderEvents(container, currentCategory) {
    const form = container.querySelector("#ndEmrUploadForm");
    const sourceInput = container.querySelector("#ndSourceFileInput");
    const zipInput = container.querySelector("#ndZipDirInput");
    const dicomInput = container.querySelector("#ndDicomStudyInput");
    const uploadBtn = container.querySelector("#ndUploadBtn");
    const dropzone = container.querySelector("#ndEmrDropzone");
    const dropzoneText = container.querySelector("#ndEmrDropzoneText");

    const templateSelect = container.querySelector("#ndTemplateSelect");
    const fetchBtn = container.querySelector("#ndFetchTemplateBtn");
    const openPatientTemplateBtn = container.querySelector("#ndOpenPatientTemplateBtn");
    const templateMenuDropdown = container.querySelector("#ndTemplateMenuDropdown");
    const openModuleBtn = container.querySelector("#ndOpenModuleBtn");

    let stagedFiles = [];

    // Helper to update files UI
    function updateStagedFiles(files) {
        if (!files || files.length === 0) return;
        stagedFiles = Array.from(files);
        if (stagedFiles.length === 1) {
            dropzoneText.textContent = `Selected: ${stagedFiles[0].name} (${formatFileSize(stagedFiles[0].size)})`;
        } else {
            dropzoneText.textContent = `Selected ${stagedFiles.length} files (${formatFileSize(stagedFiles.reduce((acc, f) => acc + f.size, 0))})`;
        }
    }

    if (sourceInput) {
        sourceInput.onchange = () => updateStagedFiles(sourceInput.files);
    }

    if (zipInput) {
        zipInput.onchange = () => updateStagedFiles(zipInput.files);
    }

    if (dropzone) {
        dropzone.onclick = () => {
            if (sourceInput) sourceInput.click();
        };

        dropzone.ondragover = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#007bff';
            dropzone.style.background = '#f0f7ff';
        };

        dropzone.ondragleave = () => {
            dropzone.style.borderColor = '';
            dropzone.style.background = '';
        };

        dropzone.ondrop = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '';
            dropzone.style.background = '';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                updateStagedFiles(e.dataTransfer.files);
            }
        };
    }

    // Submit handler
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            // Collect all files
            let filesToUpload = [];
            if (stagedFiles.length > 0) {
                filesToUpload = stagedFiles;
            } else if (sourceInput && sourceInput.files && sourceInput.files.length > 0) {
                filesToUpload = Array.from(sourceInput.files);
            } else if (zipInput && zipInput.files && zipInput.files.length > 0) {
                filesToUpload = Array.from(zipInput.files);
            }

            if (filesToUpload.length === 0) {
                showToast("Please choose files or drop them onto the upload area.", "warning");
                return;
            }

            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            }

            const formData = new FormData();
            for (let i = 0; i < filesToUpload.length; i++) {
                formData.append('files[]', filesToUpload[i]);
            }
            formData.append('category', currentCategory);
            
            const effectivePatientId = (selectedPatientId !== 'unassigned' && selectedPatientId !== 'all') 
                ? selectedPatientId 
                : '';
            formData.append('patient_id', effectivePatientId);

            if (dicomInput && dicomInput.value.trim()) {
                formData.append('dicom_study_name', dicomInput.value.trim());
            }

            try {
                const response = await fetch(`${API_URL}/new-documents/upload`, {
                    method: "POST",
                    credentials: "include",
                    body: formData
                });

                const res = await response.json();
                if (res.success) {
                    showToast(res.message || "File(s) uploaded successfully!", "success");
                    await updateStats();
                    await refreshDocumentsAndTree();

                    const uploaded = res.data || [];
                    if (uploaded.length === 1) {
                        const newDoc = currentDocuments.find(d => d.id === uploaded[0].id);
                        if (newDoc) {
                            activeDocument = newDoc;
                            renderTree();
                            renderViewer(newDoc);
                            return;
                        }
                    }
                    // Multiple files or reset
                    renderUploader(currentCategory);
                } else {
                    showToast(res.message || "Failed to upload document(s).", "error");
                    if (uploadBtn) {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = 'Upload';
                    }
                }
            } catch (err) {
                console.error(err);
                showToast("Error occurred during file upload.", "error");
                if (uploadBtn) {
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = 'Upload';
                }
            }
        };
    }

    // Load templates for bottom bar
    loadTemplates(templateSelect, templateMenuDropdown);

    // Fetch Template event
    if (fetchBtn && templateSelect) {
        fetchBtn.onclick = () => {
            const selectedVal = templateSelect.value;
            if (!selectedVal) {
                showToast("Please select a template to fetch.", "warning");
                return;
            }

            const opt = templateSelect.options[templateSelect.selectedIndex];
            const filename = opt ? (opt.dataset.name || opt.text) : 'document_template.pdf';

            const link = document.createElement('a');
            link.href = selectedVal;
            link.download = filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast(`Downloading template "${filename}"`, "success");
        };
    }

    // Open Patient Template dropdown toggle
    if (openPatientTemplateBtn && templateMenuDropdown) {
        openPatientTemplateBtn.onclick = (e) => {
            e.stopPropagation();
            const isShown = templateMenuDropdown.style.display !== 'none';
            templateMenuDropdown.style.display = isShown ? 'none' : 'block';
        };

        document.addEventListener('click', () => {
            if (templateMenuDropdown) templateMenuDropdown.style.display = 'none';
        }, { once: true });
    }

    // Open Module button
    if (openModuleBtn) {
        openModuleBtn.onclick = () => {
            if (window.tabManager && typeof window.tabManager.openTab === 'function') {
                window.tabManager.openTab('admin_document_templates', 'Document Templates');
            } else {
                showToast("Document Templates module is accessible under Administration > Document Templates.", "info");
            }
        };
    }
}

async function loadTemplates(selectEl, dropdownEl) {
    try {
        const res = await api('/new-documents/templates');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const templates = res.data;

            if (selectEl) {
                selectEl.innerHTML = `
                    <option value="">-- Select Template --</option>
                    ${templates.map(t => `
                        <option value="${escapeHtml(t.file_path)}" data-name="${escapeHtml(t.template_filename)}">
                            ${escapeHtml(t.template_filename)}
                        </option>
                    `).join('')}
                `;
            }

            if (dropdownEl) {
                dropdownEl.innerHTML = `
                    <div style="padding: 6px 12px; font-weight: 600; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; margin-bottom: 4px;">
                        AVAILABLE PATIENT TEMPLATES
                    </div>
                    ${templates.map(t => `
                        <div class="nd-menu-item" data-path="${escapeHtml(t.file_path)}" data-name="${escapeHtml(t.template_filename)}">
                            <i class="fas fa-file-pdf" style="color: #ef4444; font-size: 14px;"></i>
                            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${escapeHtml(t.template_filename)}
                            </span>
                        </div>
                    `).join('')}
                `;

                dropdownEl.querySelectorAll('.nd-menu-item').forEach(item => {
                    item.onclick = (e) => {
                        e.stopPropagation();
                        dropdownEl.style.display = 'none';
                        const path = item.dataset.path;
                        const name = item.dataset.name;
                        window.open(path, '_blank');
                    };
                });
            }
        }
    } catch (e) {
        console.error("Failed to load document templates", e);
    }
}

function renderViewer(doc) {
    const container = document.getElementById("ndViewerContainer");
    if (!container) return;

    const isImage = doc.mime_type && doc.mime_type.startsWith('image/');
    const isPdf = doc.mime_type === 'application/pdf' || (doc.original_filename && doc.original_filename.endsWith('.pdf'));
    const isText = doc.mime_type && (doc.mime_type.startsWith('text/') || doc.mime_type === 'application/json');

    const patientBadge = doc.patient_name 
        ? `<strong style="color: #2563eb;">${escapeHtml(doc.patient_name)} (${escapeHtml(doc.patient_no || '')})</strong>`
        : `<span style="color: #ea580c; font-weight: 500;">Unassigned Upload</span>`;

    let previewHtml = '';
    if (isImage) {
        previewHtml = `
            <div style="text-align: center; width: 100%; padding: 20px;">
                <img src="${escapeHtml(doc.file_path)}" alt="${escapeHtml(doc.title)}" style="max-width: 100%; max-height: 650px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            </div>
        `;
    } else if (isPdf) {
        previewHtml = `
            <iframe src="${escapeHtml(doc.file_path)}" style="width: 100%; height: 700px; border: none; border-radius: 4px;"></iframe>
        `;
    } else {
        previewHtml = `
            <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                <i class="fas fa-file-alt" style="font-size: 54px; margin-bottom: 16px; color: #94a3b8; display: block;"></i>
                <h3 style="font-size: 16px; margin: 0 0 8px 0; color: #1e293b;">${escapeHtml(doc.original_filename)}</h3>
                <p style="font-size: 13.5px; margin: 0 0 20px 0;">Preview is not available for this file type.</p>
                <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.original_filename)}" class="nd-btn-submit" style="text-decoration: none;">
                    <i class="fas fa-download"></i> Download File
                </a>
            </div>
        `;
    }

    container.innerHTML = `
        <div>
            <!-- Document View Toolbar -->
            <div class="nd-view-toolbar">
                <div class="nd-view-meta">
                    <h2>${escapeHtml(doc.title || doc.original_filename)}</h2>
                    <div class="nd-view-meta-sub">
                        <span>Patient: ${patientBadge}</span>
                        <span>Category: <strong>${escapeHtml(doc.category || 'General')}</strong></span>
                        <span>Date: ${escapeHtml(doc.created_at || 'N/A')}</span>
                        <span>Size: ${formatFileSize(doc.file_size)}</span>
                    </div>
                </div>
                <div class="nd-view-actions">
                    <a href="${escapeHtml(doc.file_path)}" download="${escapeHtml(doc.original_filename)}" class="nd-btn-action">
                        <i class="fas fa-download"></i> Download
                    </a>
                    <a href="${escapeHtml(doc.file_path)}" target="_blank" class="nd-btn-action">
                        <i class="fas fa-external-link-alt"></i> New Tab
                    </a>
                    <button type="button" class="nd-btn-action" id="ndEditDocBtn">
                        <i class="fas fa-edit"></i> Edit / Assign
                    </button>
                    <button type="button" class="nd-btn-action nd-btn-danger" id="ndDeleteDocBtn">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>

            ${doc.description ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 14px; margin-bottom: 16px; font-size: 13.5px;">
                    <strong>Notes:</strong> ${escapeHtml(doc.description)}
                </div>
            ` : ''}

            <!-- Preview Box -->
            <div class="nd-preview-box">
                ${previewHtml}
            </div>
        </div>
    `;

    // Toolbar event bindings
    const editBtn = container.querySelector("#ndEditDocBtn");
    const deleteBtn = container.querySelector("#ndDeleteDocBtn");

    if (editBtn) {
        editBtn.onclick = () => openEditAssignModal(doc);
    }

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (!confirm(`Are you sure you want to delete "${doc.title || doc.original_filename}"?`)) return;

            try {
                const res = await api('/new-documents/delete', {
                    method: 'DELETE',
                    body: JSON.stringify({ id: doc.id })
                });

                if (res.success) {
                    showToast("Document deleted successfully.", "success");
                    activeDocument = null;
                    await updateStats();
                    await refreshDocumentsAndTree();
                    renderUploader(selectedCategoryName);
                } else {
                    showToast(res.message || "Failed to delete document.", "error");
                }
            } catch (err) {
                console.error(err);
                showToast("Error deleting document.", "error");
            }
        };
    }
}

function openEditAssignModal(doc) {
    const existingModal = document.getElementById("ndEditModal");
    if (existingModal) existingModal.remove();

    const catOptions = categoriesList
        .filter(c => c.name !== 'Categories')
        .map(c => `
            <option value="${escapeHtml(c.name)}" ${c.name === doc.category ? 'selected' : ''}>
                ${escapeHtml(c.name)}
            </option>
        `).join('');

    const patientOptions = `
        <option value="">-- Leave Unassigned (New Document Upload) --</option>
        ${patientsList.map(p => `
            <option value="${p.id}" ${p.id == doc.patient_id ? 'selected' : ''}>
                ${escapeHtml(p.first_name || '')} ${escapeHtml(p.last_name || '')} (${escapeHtml(p.patient_no || 'ID-' + p.id)})
            </option>
        `).join('')}
    `;

    const modal = document.createElement("div");
    modal.id = "ndEditModal";
    modal.className = "nd-modal-overlay";
    modal.innerHTML = `
        <div class="nd-modal-card">
            <h3 style="margin: 0 0 16px 0; font-size: 17px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-edit" style="color: #2563eb;"></i>
                Edit Document Details & Patient Assignment
            </h3>

            <div class="nd-form-group">
                <label class="nd-form-label">Assigned Patient</label>
                <select class="nd-form-select" id="ndEditPatientSelect">
                    ${patientOptions}
                </select>
            </div>

            <div class="nd-form-group">
                <label class="nd-form-label">Category</label>
                <select class="nd-form-select" id="ndEditCategorySelect">
                    ${catOptions}
                </select>
            </div>

            <div class="nd-form-group">
                <label class="nd-form-label">Document Title</label>
                <input type="text" class="nd-form-input" id="ndEditTitleInput" value="${escapeHtml(doc.title || '')}">
            </div>

            <div class="nd-form-group">
                <label class="nd-form-label">Description / Notes</label>
                <textarea class="nd-form-textarea" id="ndEditDescInput" rows="3">${escapeHtml(doc.description || '')}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button type="button" class="nd-btn-action" id="ndCancelEditBtn">Cancel</button>
                <button type="button" class="nd-btn-submit" id="ndSaveEditBtn">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#ndCancelEditBtn").onclick = () => modal.remove();

    modal.querySelector("#ndSaveEditBtn").onclick = async () => {
        const patientId = modal.querySelector("#ndEditPatientSelect").value;
        const category = modal.querySelector("#ndEditCategorySelect").value;
        const title = modal.querySelector("#ndEditTitleInput").value.trim();
        const description = modal.querySelector("#ndEditDescInput").value.trim();

        try {
            const res = await api('/new-documents/update', {
                method: 'PUT',
                body: JSON.stringify({
                    id: doc.id,
                    patient_id: patientId,
                    category: category,
                    title: title,
                    description: description
                })
            });

            if (res.success) {
                showToast("Document details updated successfully!", "success");
                modal.remove();
                await updateStats();
                await refreshDocumentsAndTree();

                // Refresh viewer with updated doc
                const updated = currentDocuments.find(d => d.id === doc.id);
                if (updated) {
                    activeDocument = updated;
                    renderViewer(updated);
                }
            } else {
                showToast(res.message || "Failed to update document.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Error updating document.", "error");
        }
    };
}

function getFileIcon(mime, filename) {
    if (!mime && filename) {
        if (filename.endsWith('.pdf')) return 'fas fa-file-pdf';
        if (filename.endsWith('.jpg') || filename.endsWith('.png') || filename.endsWith('.jpeg')) return 'fas fa-file-image';
        if (filename.endsWith('.doc') || filename.endsWith('.docx')) return 'fas fa-file-word';
        if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return 'fas fa-file-excel';
    }
    if (mime) {
        if (mime.includes('pdf')) return 'fas fa-file-pdf';
        if (mime.includes('image')) return 'fas fa-file-image';
        if (mime.includes('word')) return 'fas fa-file-word';
        if (mime.includes('excel') || mime.includes('spreadsheet')) return 'fas fa-file-excel';
    }
    return 'fas fa-file-alt';
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
