export function DocumentsView()
{
    return `
<div class="docs-page">
    <div class="docs-topbar">
        <div>
            <h1>Documents and Forms</h1>
            <p>Complete pending forms, sign documents, and manage your health records</p>
        </div>

        <div class="docs-toolbar">
            <button type="button" class="docs-tool-btn" id="docsReloadBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>
                Reload
            </button>
            <button type="button" class="docs-tool-btn" id="docsUploadBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"></path><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path></svg>
                Upload
            </button>
            <button type="button" class="docs-tool-btn" id="docsExitBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>
                Exit to Dashboard
            </button>
        </div>
    </div>

    <!-- The new toolbar (Left side of the OpenEMR screenshot) -->
    <div style="display: flex; gap: 8px; padding: 0 40px 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;">
        <button type="button" id="docsSignatureOpenBtn" class="btn-secondary" style="flex: 1; background: white; border-color: #cbd5e1; color: #475569; font-weight: 500; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Signature
        </button>
        <div style="position: relative; display: inline-block; flex: 1;" id="docsSelectFormContainer">
            <button type="button" id="docsSelectFormBtn" class="btn-secondary" style="width: 100%; background: white; border-color: #cbd5e1; color: #475569; font-weight: 500; display: flex; justify-content: center; align-items: center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Select Form
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-left: 6px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="docsSelectFormDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); min-width: 100%; z-index: 50; margin-top: 4px;">
                <div style="background: #0f172a; color: white; padding: 8px 12px; font-weight: 600; font-size: 14px; text-align: center;">General</div>
                <a href="#" class="docs-form-option" data-form="hipaa" style="display: block; padding: 10px 16px; color: #475569; text-decoration: none; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Hipaa Document</a>
                <a href="#" class="docs-form-option" data-form="insurance" style="display: block; padding: 10px 16px; color: #475569; text-decoration: none; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Insurance Info</a>
                <a href="#" class="docs-form-option" data-form="medical" style="display: block; padding: 10px 16px; color: #475569; text-decoration: none; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Medical History</a>
                <a href="#" class="docs-form-option" data-form="privacy" style="display: block; padding: 10px 16px; color: #475569; text-decoration: none; font-size: 14px;">Privacy Document</a>
            </div>
        </div>
        <button type="button" class="btn-secondary" id="docsSaveDraftBtn" style="flex: 1; background: white; border-color: #cbd5e1; color: #475569; font-weight: 500; display: flex; justify-content: center; align-items: center; display: none;">
            Save as Draft
        </button>
        <button type="button" class="btn-secondary" id="docsSubmitCompletedBtn" style="flex: 1; background: white; border-color: #cbd5e1; color: #475569; font-weight: 500; display: flex; justify-content: center; align-items: center; display: none;">
            Submit Completed
        </button>
        <button type="button" class="btn-secondary" style="flex: 1; background: white; border-color: #cbd5e1; color: #475569; font-weight: 500; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Activities
        </button>
    </div>

    <!-- The "Editing" bar - styled properly -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 40px; margin-bottom: 32px; display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></div>
        <span style="font-weight: 600; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Editing Document</span>
    </div>

    <div class="docs-body" id="docsMainBody">
        <div class="docs-instructions">
            <h2>Instructions for completing Pending Forms</h2>
            <p class="docs-instructions-welcome" style="margin-bottom: 24px;">Welcome<span id="docsWelcomeName"></span></p>

            <h3>Filling Out Forms</h3>
            <ul>
                <li>Select a form from the list on the left by clicking the appropriate button. After selection, the page will go to full page. To exit, click the Action menu horizontal barred button to toggle page mode.</li>
                <li>Answer all the appropriate queries in the form.</li>
                <li>When finished, click either the <strong>Save</strong> or <strong>Submit Document</strong> option in the top Action Menu. The 'Save' button will save the currently edited form to your Document History and will still be available for editing until you delete the form or send to your provider using the 'Submit Document' action button.</li>
            </ul>

            <h3>Sending Documents</h3>
            <ul>
                <li>Click the <strong>Submit Document</strong> button from the Action Menu.</li>
                <li>Once sent, the form will show in your Document History as <em>Pending review</em>. You may still make changes to the form until reviewed by the practice administrator. Once the review is completed, Document History will show the form as <em>Locked</em> and no further edits are available. At this point, your completed document is recorded in your chart (medical record).</li>
            </ul>
        </div>

        <div id="docsListContainer"></div>
    </div>

    <!-- New Form View Container -->
    <div id="docsFormBody" style="display: none;">
        <div style="background: #0f172a; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 500; font-size: 14px;">
                <span style="font-weight: bold; background: white; color: black; padding: 2px 4px; margin-right: 8px;" id="docsFormHeaderTitle">Hipaa Document</span>
                New Version: Dated:<span id="docsFormHeaderDate"></span> Status:<span id="docsFormHeaderStatus">New</span>
            </div>
            <button type="button" id="docsFormDismissBtn" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 4px 12px; font-size: 13px; cursor: pointer;">Dismiss Form</button>
        </div>

        <div style="padding: 24px 40px; background: white; border: 1px solid #e2e8f0; border-top: none; min-height: 500px;" id="docsFormContent">
            <!-- HIPAA Form Content -->
            <div id="docsHipaaFormContent">
                <h2 style="font-size: 24px; font-weight: normal; margin-bottom: 16px;">HIPAA Declaration</h2>
                <p style="margin-bottom: 16px;">Given today: <span id="hipaaGivenToday"></span></p>
                
                <p style="margin-bottom: 16px;">OpenEMR Software makes it a priority to keep this piece of software updated with the most recent available security options, so it will integrate easily into a HIPAA-compliant practice and will protect our customers with at least the official HIPAA regulations.</p>
                
                <p style="font-style: italic; margin-bottom: 8px;">The Practice:</p>
                <div style="margin-bottom: 16px; line-height: 1.6;">
                    (a) Is required by federal law to maintain the privacy of your PHI and to provide you with this Privacy Notice detailing the Practice's legal duties and privacy practices with respect to your PHI<br>
                    (b) Under the Privacy Rule, it may be required by other laws to grant greater access or maintain greater restrictions on the use of, or release of your PHI than that which is provided for under federal HIPAA laws.<br>
                    (c) Is required to abide by the terms of the Privacy Notice<br>
                    (d) Reserves the right to change the terms of this Privacy Notice and make new Privacy Notice provisions effective for all of your PHI that it maintains if needed<br>
                    (e) Will distribute any revised Privacy Notice to you prior to implementation<br>
                    (f) Will not retaliate against you for filing a complaint
                </div>

                <p style="font-style: italic; margin-bottom: 8px;">Patient Communications:</p>
                <p style="margin-bottom: 16px; line-height: 1.6;">
                    Health Insurance Privacy Act 1996 USA, requires to inform you of the following government stipulations in order for us to contact you with educational and promotional items in the future via e-mail, U.S. mail, telephone, and/or prerecorded messages. We will not share, sell, or use your personal contact information for spam messages.<br>
                    I am aware and have read the policies of this practice towards secrecy and digital information protection:<br>
                    The Practice set up their User accounts for the OpenEMR databases, so it requires Users to log in with a password.<br>
                    The User have to exit or log out of any medical information when not using it or as soon as Default timeout is reached.<br>
                    When using this medical information registration in front of patients the User should use the "Privacy" feature to hide PHI (Personal Health Information) for other patients in the Search screen.<br>
                    We have developed and will use standard operating procedures (SOPs) requiring any use of the Export Patients Medical or other information to be documented.<br>
                    Users are only allowed to store a copy of your Medical information on a laptop computer or other portable media that is taken outside The Practice if recorded in writing. By signing out of The Practice with any portable device or transport medium this information is to be erased when finished with the need to take this information out of The Practice, if possible this information is only to be taken outside The Practice in encrypted format.<br>
                    Only specific technicians may have occasional access to our hardware and Software. The HIPAA Privacy Rule requires that a practice have a signed Business Associate Contract before granting such access. The Technicians are trained on HIPAA regulations and limit the use and disclosure of customer data to the minimum necessary.
                </p>

                <p style="font-style: italic; font-size: 20px; margin: 32px 0;">I acknowledge receipt of this notice, have read the contents and understand the content.</p>

                <div style="margin-bottom: 32px; line-height: 1.6;">
                    Patient Name: <span id="hipaaPatientName"></span> Sex: <span id="hipaaPatientSex"></span> <span style="font-style: italic;">hereby signs and agree to the terms of this agreement .</span><br>
                    Our external ID:<span id="hipaaPatientId"></span><br>
                    Born: <span id="hipaaPatientDob"></span><br>
                    Home Address: <span id="hipaaPatientAddress"></span><br>
                    Zip: <span id="hipaaPatientZip"></span>; City: <span id="hipaaPatientCity"></span>; State: <span id="hipaaPatientState"></span><br>
                    Home Phone: <span id="hipaaPatientPhone"></span>
                </div>

                <div style="margin-bottom: 24px; display: flex; align-items: flex-end; gap: 8px;">
                    <span>Patient Signature: </span>
                    <div style="min-width: 200px; border-bottom: 1px solid black; padding-bottom: 4px; display: inline-block;">
                        <img id="hipaaSignatureImg" src="" style="display: none; max-height: 50px; margin-top: -20px;" alt="Signature">
                        <span id="hipaaSignaturePlaceholder" style="color: #ef4444; font-size: 14px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: text-bottom;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            Click in signature
                        </span>
                    </div>
                </div>

                <div style="margin-bottom: 32px;">
                    Patient:<span id="hipaaPatientName2"></span> Date: <span id="hipaaGivenToday2"></span>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="font-style: italic; cursor: pointer;">
                        I do not accept these terms: <input type="checkbox" id="hipaaRefusalCheckbox">
                    </label>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 40px;">
                    <label>Patient refusal to sign due to the following reason:</label>
                    <input type="text" id="hipaaRefusalReason" style="border: 1px solid #cbd5e1; padding: 4px; width: 300px;">
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <button type="button" id="docsFormDeleteBtn" style="background: #ef4444; border: none; color: white; padding: 8px 16px; font-size: 14px; border-radius: 4px; cursor: pointer; display: none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: text-bottom;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete Document
                    </button>
                    <button type="button" id="docsFormDismissBtnBottom" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 16px; font-size: 14px; cursor: pointer;">Dismiss Form</button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="docsUploadModalOverlay">
    <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
            <h2>Upload Document</h2>
            <button type="button" class="modal-close" id="docsUploadModalClose">&times;</button>
        </div>

        <div id="docsUploadFormAlert"></div>

        <form id="docsUploadForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>File</label>
                    <input type="file" id="docsUpload_file" class="form-input" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx">
                </div>

                <div class="form-group full">
                    <label>Category</label>
                    <select id="docsUpload_category" class="form-input">
                        <option value="">-- Please Select --</option>
                        <option value="Lab Result">Lab Result</option>
                        <option value="Imaging">Imaging</option>
                        <option value="Insurance Card">Insurance Card</option>
                        <option value="Consent Form">Consent Form</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <textarea id="docsUpload_description" class="form-input" rows="3"></textarea>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="docsUploadCancelBtn">Cancel</button>
                <button class="login-btn" type="submit">Upload</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="docsSignatureModalOverlay">
    <div class="modal-box" style="max-width: 600px; padding: 0;">
        <div style="background: white; border-bottom: 1px solid #e2e8f0;">
            <canvas id="docsSignatureCanvas" width="600" height="300" style="width: 100%; height: 300px; touch-action: none; cursor: crosshair; display: block;"></canvas>
            <div style="text-align: center; padding: 8px; color: #475569; font-size: 12px; border-top: 1px solid #e2e8f0; background: #f8fafc;">Sign Above</div>
        </div>
        <div style="display: flex; background: #f1f5f9; border-top: 1px solid #e2e8f0;">
            <button type="button" id="docsSignatureClearBtn" style="flex: 1; padding: 12px; background: #f8fafc; border: none; border-right: 1px solid #e2e8f0; color: #334155; font-size: 14px; cursor: pointer;">Clear Canvas</button>
            <button type="button" id="docsSignatureUseCurrentBtn" style="flex: 1; padding: 12px; background: #f8fafc; border: none; border-right: 1px solid #e2e8f0; color: #334155; font-size: 14px; cursor: pointer;">Use Current</button>
            <button type="button" id="docsSignatureCancelBtn" style="flex: 1; padding: 12px; background: #ef4444; border: none; border-right: 1px solid #dc2626; color: white; font-size: 14px; cursor: pointer;">Cancel</button>
            <button type="button" id="docsSignatureSaveBtn" style="flex: 1; padding: 12px; background: #22c55e; border: none; color: white; font-size: 14px; font-weight: 500; cursor: pointer;">Sign and Save</button>
        </div>
    </div>
</div>
`;
}
