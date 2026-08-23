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
            <button type="button" class="docs-tool-btn" id="docsHelpBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Help
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
        <button type="button" id="docsActivitiesBtn" class="btn-secondary" style="flex: 1; background: white; border-color: #cbd5e1; color: #475569; font-weight: 500; display: flex; justify-content: center; align-items: center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Activities
        </button>
    </div>

    <!-- The "Editing" bar - styled properly -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 40px; margin-bottom: 32px; display: flex; align-items: center; gap: 8px;" id="docsEditingBar">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></div>
        <span style="font-weight: 600; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Editing Document</span>
    </div>

    <div class="docs-body" id="docsMainBody">
        <div class="docs-instructions">
            <h2>Instructions for completing Pending Forms</h2>
            <p class="docs-instructions-welcome" style="margin-bottom: 24px;">Welcome <span id="docsWelcomeName"></span></p>

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

    <!-- Activities View Container -->
    <div class="docs-body" id="docsActivitiesBody" style="display: none; padding: 0 40px;">
        <h2 style="text-align: center; font-weight: normal; margin-bottom: 16px; font-size: 22px;">Document and Forms Activity</h2>
        
        <div style="display: flex; justify-content: flex-end; margin-bottom: 8px; font-style: italic; font-size: 13px;">
            <label style="cursor: pointer;"><input type="checkbox" style="margin-right: 4px;">(Show All)</label>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #e2e8f0; text-align: left;">
            <thead>
                <tr style="background: #1e293b; color: white;">
                    <th style="padding: 10px 12px; font-weight: bold; width: 40px;">Id</th>
                    <th style="padding: 10px 12px; font-weight: bold;">Document</th>
                    <th style="padding: 10px 12px; font-weight: bold;">Create Date</th>
                    <th style="padding: 10px 12px; font-weight: bold;">Reviewed Date <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></th>
                    <th style="padding: 10px 12px; font-weight: bold;">Status</th>
                    <th style="padding: 10px 12px; font-weight: bold;">Signed</th>
                    <th style="padding: 10px 12px; font-weight: bold;">Signed Date</th>
                </tr>
            </thead>
            <tbody id="docsActivitiesTableBody">
                <!-- Activities rows will go here -->
            </tbody>
        </table>
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

    <!-- Insurance Form View Container -->
    <div id="docsInsuranceFormBody" style="display: none;">
        <div style="background: #0f172a; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 14px; font-weight: 500;">
                <span style="font-weight: bold; margin-right: 8px;">Editing</span>
                <span style="background: white; color: black; padding: 2px 4px; border-radius: 2px; margin-right: 8px;">Insurance Info</span>
                New Version: Dated:<span id="docsInsuranceFormHeaderDate"></span> 
                Status:<span id="docsInsuranceFormHeaderStatus" style="font-weight: bold;">New</span>
            </div>
            <button type="button" id="docsInsuranceFormDismissBtn" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 4px 12px; font-size: 12px; cursor: pointer;">Dismiss Form</button>
        </div>
        <div style="padding: 40px; display: flex; justify-content: center; background: #f8fafc;">
            <div style="background: white; border: 1px solid #e2e8f0; max-width: 800px; width: 100%; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h2 style="text-align: center; margin-top: 0; margin-bottom: 24px; font-weight: normal; font-size: 24px;">INSURANCE INFORMATION</h2>

                <div style="display: flex; gap: 24px; margin-bottom: 24px;">
                    <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox"> Medicare# <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;"></label>
                    <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox"> Medicaid# <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;"></label>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox"> Workers Compensation (job injury) If so then to whom is bill to be sent? 
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 250px;">
                    </label>
                </div>

                <div style="margin-bottom: 32px;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox"> Other Medical Insurance: Group# 
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                        ID# <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                    </label>
                </div>

                <div style="margin-bottom: 32px;">
                    <p style="margin-bottom: 16px;">Name/Address 1st or 2nd Insurance:</p>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 12px; align-items: center; margin-bottom: 12px;">
                        <label>Name:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Relationship:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 60px auto 80px; gap: 12px; align-items: center; margin-bottom: 12px;">
                        <label>Address</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>State</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Zip</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 12px; align-items: center;">
                        <label>Phone:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Secondary Phone:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                </div>

                <div style="margin-bottom: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <p style="margin-bottom: 16px;">Are you personally responsible for the payment of your fees? 
                        <label style="margin-left: 8px; cursor: pointer;"><input type="radio" name="insResponsible"> Yes</label>
                        <label style="margin-left: 8px; cursor: pointer;"><input type="radio" name="insResponsible"> No</label>
                    </p>
                    
                    <p style="margin-bottom: 16px;">If not, who is?</p>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 1fr auto 100px; gap: 12px; align-items: center; margin-bottom: 12px;">
                        <label>Name:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Relationship:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>DOB:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 60px auto 80px; gap: 12px; align-items: center; margin-bottom: 12px;">
                        <label>Address</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>State</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Zip</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 12px; align-items: center;">
                        <label>Phone:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Secondary Phone:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                </div>

                <div style="margin-bottom: 48px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <p style="margin-bottom: 16px;">Who to notify in emergency (nearest relative or friend)?</p>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 12px; align-items: center; margin-bottom: 12px;">
                        <label>Name</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Relationship</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 60px auto 80px; gap: 12px; align-items: center; margin-bottom: 12px;">
                        <label>Address:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>State:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Zip:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 12px; align-items: center;">
                        <label>Work Phone:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label>Home Phone:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <span style="font-size: 14px;">Signed by <span id="insurancePatientName"></span> on <span id="insuranceGivenToday"></span> </span>
                    <span style="cursor: pointer; padding: 2px 4px;">X</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <button type="button" id="docsInsuranceFormDeleteBtn" style="background: #ef4444; border: none; color: white; padding: 8px 16px; font-size: 14px; border-radius: 4px; cursor: pointer; display: none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: text-bottom;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete Document
                    </button>
                    <button type="button" id="docsInsuranceFormDismissBtnBottom" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 16px; font-size: 14px; cursor: pointer; margin-left: auto;">Dismiss Form</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Medical History Form View Container -->
    <div id="docsMedicalFormBody" style="display: none;">
        <div style="background: #0f172a; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 14px; font-weight: 500;">
                <span style="font-weight: bold; margin-right: 8px;">Editing</span>
                <span style="background: white; color: black; padding: 2px 4px; border-radius: 2px; margin-right: 8px;">Medical History</span>
                New Version: Dated:<span id="docsMedicalFormHeaderDate"></span> 
                Status:<span id="docsMedicalFormHeaderStatus" style="font-weight: bold;">New</span>
            </div>
            <button type="button" id="docsMedicalFormDismissBtn" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 4px 12px; font-size: 12px; cursor: pointer;">Dismiss Form</button>
        </div>
        <div style="padding: 40px; display: flex; justify-content: center; background: #f8fafc;">
            <div style="background: white; border: 1px solid #e2e8f0; max-width: 900px; width: 100%; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h2 style="margin-top: 0; margin-bottom: 24px; font-weight: normal; font-size: 24px; color: #1e293b;">History</h2>

                <div style="margin-bottom: 12px;">
                    <label style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" checked> General
                    </label>
                </div>

                <div style="background: #cbd5e1; padding: 24px; border-radius: 4px; margin-bottom: 32px; display: grid; grid-template-columns: 150px 1fr; gap: 16px; color: #0f172a;">
                    
                    <div style="font-weight: bold;">Risk Factors:</div>
                    <div style="display: flex; flex-direction: column; gap: 6px; font-size: 14px;">
                        <label><input type="checkbox"> Varicose Veins</label>
                        <label><input type="checkbox"> Hypertension</label>
                        <label><input type="checkbox"> Diabetes</label>
                        <label><input type="checkbox"> Sickle Cell</label>
                        <label><input type="checkbox"> Fibroids</label>
                        <label><input type="checkbox"> PID (Pelvic Inflammatory Disease)</label>
                        <label><input type="checkbox"> Severe Migraine</label>
                        <label><input type="checkbox"> Heart Disease</label>
                        <label><input type="checkbox"> Thrombosis/Stroke</label>
                        <label><input type="checkbox"> Hepatitis</label>
                        <label><input type="checkbox"> Gall Bladder Condition</label>
                        <label><input type="checkbox"> Breast Disease</label>
                        <label><input type="checkbox"> Depression</label>
                        <label><input type="checkbox"> Allergies</label>
                        <label><input type="checkbox"> Infertility</label>
                        <label><input type="checkbox"> Asthma</label>
                        <label><input type="checkbox"> Epilepsy</label>
                        <label><input type="checkbox"> Contact Lenses</label>
                        <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox"> Contraceptive Complication (specify)</label>
                        <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox"> Other (specify)</label>
                    </div>

                    <div style="font-weight: bold; margin-top: 24px;">Exams/Tests:</div>
                    <div style="margin-top: 24px; background: white; border: 1px solid #94a3b8; border-radius: 2px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 1px solid #94a3b8;">
                                    <th style="text-align: left; padding: 12px; font-weight: bold;">Exam or Test</th>
                                    <th style="text-align: center; padding: 12px; font-weight: bold; width: 40px;">N/A</th>
                                    <th style="text-align: center; padding: 12px; font-weight: bold; width: 40px;">Nor</th>
                                    <th style="text-align: center; padding: 12px; font-weight: bold; width: 40px;">Abn</th>
                                    <th style="text-align: left; padding: 12px; font-weight: bold;">Date/Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Breast Exam</td>
                                    <td style="text-align: center;"><input type="radio" name="exam1"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam1"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam1"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Cardiac Echo</td>
                                    <td style="text-align: center;"><input type="radio" name="exam2"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam2"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam2"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">ECG</td>
                                    <td style="text-align: center;"><input type="radio" name="exam3"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam3"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam3"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Gynecological Exam</td>
                                    <td style="text-align: center;"><input type="radio" name="exam4"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam4"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam4"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Mammogram</td>
                                    <td style="text-align: center;"><input type="radio" name="exam5"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam5"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam5"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Physical Exam</td>
                                    <td style="text-align: center;"><input type="radio" name="exam6"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam6"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam6"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Prostate Exam</td>
                                    <td style="text-align: center;"><input type="radio" name="exam7"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam7"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam7"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Rectal Exam</td>
                                    <td style="text-align: center;"><input type="radio" name="exam8"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam8"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam8"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Sigmoid/Colonoscopy</td>
                                    <td style="text-align: center;"><input type="radio" name="exam9"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam9"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam9"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Retinal Exam</td>
                                    <td style="text-align: center;"><input type="radio" name="exam10"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam10"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam10"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Flu Vaccination</td>
                                    <td style="text-align: center;"><input type="radio" name="exam11"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam11"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam11"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Pneumonia Vaccination</td>
                                    <td style="text-align: center;"><input type="radio" name="exam12"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam12"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam12"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">LDL</td>
                                    <td style="text-align: center;"><input type="radio" name="exam13"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam13"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam13"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px;">Hemoglobin</td>
                                    <td style="text-align: center;"><input type="radio" name="exam14"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam14"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam14"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px;">PSA</td>
                                    <td style="text-align: center;"><input type="radio" name="exam15"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam15"></td>
                                    <td style="text-align: center;"><input type="radio" name="exam15"></td>
                                    <td style="padding: 12px;"><input type="text" style="width: 100%; border: 1px solid #cbd5e1; padding: 4px; box-sizing: border-box;"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="margin-bottom: 12px; margin-top: 16px;">
                    <label style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="chkFamilyHistory"> Family History
                    </label>
                </div>
                <div id="secFamilyHistory" style="display: none; background: #e2e8f0; padding: 24px; border-radius: 4px; margin-bottom: 32px; grid-template-columns: 1fr 1fr; gap: 24px; color: #0f172a;">
                    <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; align-items: center;">
                        <label style="font-weight: bold;">Father:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Siblings:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Offspring:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: 100px 1fr; gap: 12px; align-items: center;">
                        <label style="font-weight: bold;">Mother:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Spouse:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                </div>

                <div style="margin-bottom: 12px; margin-top: 16px;">
                    <label style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="chkRelatives"> Relatives
                    </label>
                </div>
                <div id="secRelatives" style="display: none; background: #e2e8f0; padding: 24px; border-radius: 4px; margin-bottom: 32px; grid-template-columns: 1fr 1fr; gap: 24px; color: #0f172a;">
                    <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;">
                        <label style="font-weight: bold;">Cancer:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Diabetes:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Heart Problems:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Epilepsy:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Suicide:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                    <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: center;">
                        <label style="font-weight: bold;">Tuberculosis:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">High Blood Pressure:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Stroke:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                        <label style="font-weight: bold;">Mental Illness:</label> <input type="text" style="border: 1px solid #cbd5e1; padding: 4px;">
                    </div>
                </div>

                <div style="margin-bottom: 12px; margin-top: 16px;">
                    <label style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="chkLifestyle"> Lifestyle
                    </label>
                </div>
                <div id="secLifestyle" style="display: none; background: #e2e8f0; padding: 24px; border-radius: 4px; margin-bottom: 32px; grid-template-columns: 150px 1fr; gap: 16px; color: #0f172a;">
                    <div style="font-weight: bold;">Tobacco:</div>
                    <div>
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px; margin-bottom: 12px; display: block;">
                        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                            <select style="border: 1px solid #cbd5e1; padding: 4px; width: 250px;">
                                <option>Unassigned</option>
                                <option>Current every day smoker</option>
                                <option>Current some day smoker</option>
                                <option>Former smoker</option>
                                <option>Never smoker</option>
                                <option>Smoker, current status unknown</option>
                                <option>Unknown if ever smoked</option>
                                <option>Heavy tobacco smoker</option>
                                <option>Light tobacco smoker</option>
                            </select>
                            <span style="font-weight: bold;">Status:</span>
                            <label><input type="radio" name="tobStatus"> Current</label>
                            <label><input type="radio" name="tobStatus"> Quit</label>
                            <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 80px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                            <span style="width: 250px; font-size: 13px;">Cigarette pack-years (Number of packs per day multiplied by number of years smoked)</span>
                            <input type="number" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;" value="0">
                        </div>
                    </div>
                    
                    <div style="font-weight: bold;">Coffee:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                        <span style="font-weight: bold; margin-left: auto;">Status:</span>
                        <label><input type="radio" name="cofStatus"> Current</label>
                        <label><input type="radio" name="cofStatus"> Quit</label>
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 80px;">
                        <label><input type="radio" name="cofStatus"> Never</label>
                        <label><input type="radio" name="cofStatus"> N/A</label>
                    </div>

                    <div style="font-weight: bold;">Alcohol:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                        <span style="font-weight: bold; margin-left: auto;">Status:</span>
                        <label><input type="radio" name="alcStatus"> Current</label>
                        <label><input type="radio" name="alcStatus"> Quit</label>
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 80px;">
                        <label><input type="radio" name="alcStatus"> Never</label>
                        <label><input type="radio" name="alcStatus"> N/A</label>
                    </div>

                    <div style="font-weight: bold;">Recreational Drugs:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                        <span style="font-weight: bold; margin-left: auto;">Status:</span>
                        <label><input type="radio" name="recStatus"> Current</label>
                        <label><input type="radio" name="recStatus"> Quit</label>
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 80px;">
                        <label><input type="radio" name="recStatus"> Never</label>
                        <label><input type="radio" name="recStatus"> N/A</label>
                    </div>

                    <div style="font-weight: bold;">Counseling:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                        <span style="font-weight: bold; margin-left: auto;">Status:</span>
                        <label><input type="radio" name="counStatus"> Current</label>
                        <label><input type="radio" name="counStatus"> Quit</label>
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 80px;">
                        <label><input type="radio" name="counStatus"> Never</label>
                        <label><input type="radio" name="counStatus"> N/A</label>
                    </div>

                    <div style="font-weight: bold;">Exercise Patterns:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                        <span style="font-weight: bold; margin-left: auto;">Status:</span>
                        <label><input type="radio" name="exStatus"> Current</label>
                        <label><input type="radio" name="exStatus"> Quit</label>
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 80px;">
                        <label><input type="radio" name="exStatus"> Never</label>
                        <label><input type="radio" name="exStatus"> N/A</label>
                    </div>

                    <div style="font-weight: bold;">Hazardous Activities:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                        <span style="font-weight: bold; margin-left: auto;">Status:</span>
                        <label><input type="radio" name="hazStatus"> Current</label>
                        <label><input type="radio" name="hazStatus"> Quit</label>
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 80px;">
                        <label><input type="radio" name="hazStatus"> Never</label>
                        <label><input type="radio" name="hazStatus"> N/A</label>
                    </div>

                    <div style="font-weight: bold;">Sleep Patterns:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                    </div>

                    <div style="font-weight: bold;">Seatbelt Use:</div>
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                        <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 150px;">
                    </div>
                </div>

                <div style="margin-bottom: 12px; margin-top: 16px;">
                    <label style="font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="chkOther"> Other
                    </label>
                </div>
                <div id="secOther" style="display: none; background: #e2e8f0; padding: 24px; border-radius: 4px; margin-bottom: 32px; grid-template-columns: 1fr 1fr; gap: 24px; color: #0f172a;">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center;">
                            <label style="font-weight: bold;">Name/Value:</label>
                            <div>
                                <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 100px; display: block; margin-bottom: 4px;">
                                <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 100px; display: block;">
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: flex-start;">
                            <label style="font-weight: bold;">Additional History:</label>
                            <textarea style="border: 1px solid #cbd5e1; padding: 4px; width: 100%; height: 80px; resize: vertical;"></textarea>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: flex-start;">
                        <label style="font-weight: bold;">Name/Value:</label>
                        <div>
                            <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 100px; display: block; margin-bottom: 4px;">
                            <input type="text" style="border: 1px solid #cbd5e1; padding: 4px; width: 100px; display: block;">
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 40px; font-size: 13px;">
                    Rev.
                </div>

                <div style="margin-bottom: 24px; margin-top: 40px;">
                    <span style="font-size: 14px;">Patient Signature: <span id="medicalPatientName" style="display: none;"></span></span>
                    <span style="cursor: pointer; padding: 2px 4px; margin-left: 8px;">X</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    <button type="button" id="docsMedicalFormDeleteBtn" style="background: #ef4444; border: none; color: white; padding: 8px 16px; font-size: 14px; border-radius: 4px; cursor: pointer; display: none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: text-bottom;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Delete Document
                    </button>
                    <button type="button" id="docsMedicalFormDismissBtnBottom" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 16px; font-size: 14px; cursor: pointer; margin-left: auto;">Dismiss Form</button>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="docsPrivacyFormBody" style="display: none;">
    <div style="background: white; border: 1px solid #cbd5e1; display: flex; flex-direction: column;">
        <div style="background: #0f172a; color: white; padding: 4px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: bold;">
            <div>Editing <span style="background: white; color: black; padding: 2px 4px; margin: 0 4px;">Privacy Document</span> New Version: Dated:<span id="docsPrivacyFormHeaderDate"></span> Status:<span id="docsPrivacyFormHeaderStatus"></span></div>
            <button type="button" id="docsPrivacyFormDismissBtn" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 2px 12px; font-size: 12px; cursor: pointer;">Dismiss Form</button>
        </div>

        <div style="padding: 24px; font-size: 13px; line-height: 1.5; color: #334155; max-height: calc(100vh - 200px); overflow-y: auto;">
            <div style="margin-bottom: 24px;">
                NOTICE OF PRIVACY PRACTICES PATIENT ACKNOWLEDGEMENT AND CONSENT TO MEDICAL TREATMENT<br>
                Patient Name: <span id="privacyPatientName" style="font-style: italic;"></span><br>
                Date of Birth: <span id="privacyPatientDOB"></span>
            </div>

            <p style="margin-bottom: 16px;">
                I have received and understand this practice's Notice of Privacy Practices written in plain English. The notice provides in detail the uses and disclosures of my protected health information that may be made by this practice, my individual rights, how I may exercise those rights, and the practices legal duties with respect to my information.
            </p>

            <p style="margin-bottom: 16px;">
                I understand that the practice reserves the right to change the terms of the Privacy Practices, and to make changes regarding all protected health information. If changes occur then the practice will provide me with a revised copy upon request.
            </p>

            <p style="margin-bottom: 16px;">
                I voluntarily consent to care, including physician examination and tests such as x-ray, laboratory tests and to medical treatment by my physician or his/her assistants or designees, as may be necessary in the judgment of my physician. No guarantees have been made to me as the result of treatment or examination.
            </p>

            <p style="margin-bottom: 16px;">
                Authorization for:<br>
                In consideration for services received by I agree to pay any and all charges as billed. I also request that direct payments be made to on my behalf by insurers and agencies in the settlement of any of my claims. I understand that my protected health information may need to be released for the purpose of treatment, payment or health care operations.
            </p>

            <p style="margin-bottom: 24px;">
                Medicare Patients:<br>
                I certify that the information given by me for application for payment under title XVIII of the Social Security Act is correct. I authorize any holder of medical or other relevant information about me be released to the Social Security Administration or it's intermediaries of carriers and such information needed to support application for payment. Including records pertaining to HIV status or treatment (AIDS records), drug and alcohol treatment, and or psychiatric treatment. I assign and authorize payment directly to for the unpaid charges for the physician's services. I understand that I am responsible for all insurance deductibles and coinsurance.
            </p>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                <div>Comments: </div>
                <div>Signature: </div>
                <div>Do you authorize electronic signature </div>
                <div>Relationship to patient (if signed by a personal representative): </div>
                <div>Are you Primary Care Giver: YesNo </div>
                <div>Date: <span id="privacyFormDateBottom"></span></div>
            </div>

            <div style="margin-bottom: 40px;">
                Clinic Representative Signature Signed: 
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <button type="button" id="docsPrivacyFormDeleteBtn" style="background: #ef4444; border: none; color: white; padding: 8px 16px; font-size: 14px; border-radius: 4px; cursor: pointer; display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: text-bottom;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete Document
                </button>
                <button type="button" id="docsPrivacyFormDismissBtnBottom" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; padding: 8px 16px; font-size: 14px; cursor: pointer; margin-left: auto;">Dismiss Form</button>
            </div>
        </div>
    </div>
</div>



<div class="modal-overlay" id="docsUploadModalOverlay" style="background-color: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);">
    <div class="modal-box" style="max-width: 480px; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">Upload Document</h2>
            <button type="button" id="docsUploadModalClose" style="background: transparent; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px; line-height: 1;">&times;</button>
        </div>

        <div id="docsUploadFormAlert"></div>

        <form id="docsUploadForm">
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">File</label>
                    <input type="file" id="docsUpload_file" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 14px; color: #334155; outline: none; transition: border-color 0.2s;" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx">
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Category</label>
                    <select id="docsUpload_category" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #334155; outline: none; transition: border-color 0.2s; appearance: none; background: white url('data:image/svg+xml;utf8,<svg fill=\\'none\\' height=\\'20\\' viewBox=\\'0 0 20 20\\' width=\\'20\\' xmlns=\\'http://www.w3.org/2000/svg\\'><path d=\\'M5 7.5L10 12.5L15 7.5\\' stroke=\\'%2364748b\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1.5\\'/></svg>') no-repeat right 12px center;">
                        <option value="">-- Please Select --</option>
                        <option value="Lab Result">Lab Result</option>
                        <option value="Imaging">Imaging</option>
                        <option value="Insurance Card">Insurance Card</option>
                        <option value="Consent Form">Consent Form</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Description</label>
                    <textarea id="docsUpload_description" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #334155; outline: none; transition: border-color 0.2s; resize: vertical;" rows="3"></textarea>
                </div>
            </div>

            <div style="display: flex; gap: 16px; margin-top: 32px;">
                <button type="button" id="docsUploadCancelBtn" style="flex: 1; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Cancel</button>
                <button type="submit" style="flex: 1; padding: 12px; background: #8b5cf6; border: none; border-radius: 8px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4); transition: transform 0.1s, box-shadow 0.2s;">Upload</button>
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

<div class="modal-overlay" id="docsDeleteConfirmModalOverlay" style="display: none;">
    <div class="modal-box" style="max-width: 400px; text-align: center;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 18px; font-weight: 600; color: #0f172a;">Confirm Deletion</h3>
        <p style="margin-bottom: 24px; color: #475569; font-size: 14px;">Are you sure you want to delete this document? This action cannot be undone.</p>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button type="button" id="docsDeleteCancelModalBtn" class="btn-secondary" style="padding: 8px 16px; background: white; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button type="button" id="docsDeleteConfirmModalBtn" style="padding: 8px 16px; background: #ef4444; border: none; color: white; border-radius: 4px; cursor: pointer;">Delete</button>
        </div>
    </div>
    <!-- Help Container -->
    <div id="docsHelpContainer" style="display: none; width: 100%; background: #ffffff;">
        <!-- Header -->
        <div style="display: flex; align-items: center; background-color: #0f172a; color: white; padding: 12px 16px; width: 100%; box-sizing: border-box;">
            <button id="btnBackToDocsFromHelp" style="background: white; border: 1px solid #ccc; padding: 4px 12px; border-radius: 2px; color: black; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px; margin-right: 16px;">
                &larr; Back
            </button>
            <h2 style="margin: 0; font-size: 20px; font-weight: 500;">
                Medical Records Help
            </h2>
        </div>
        
        <!-- List Items -->
        <div style="display: flex; flex-direction: column; width: 100%;">
            
            <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #334155; font-weight: normal;">View Summary of Care</h3>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">View your Summary of Care document that includes a printable version of your healthcare information. This document can be used to transfer your care to another healthcare facility. In technical terms it is called a C-CDA.</p>
                </div>
            </div>
            
            <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #334155; font-weight: normal;">Download Summary of Care</h3>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">Download a copy of your Summary of Care document. This document can be used to transfer your care to another healthcare facility. In technical terms it is called a C-CDA.</p>
                </div>
            </div>
            
            <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #334155; font-weight: normal;">Customized Medical History Report</h3>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">View, Print, or Download individual items of your medical history based upon your custom selections</p>
                </div>
            </div>
            
            <div style="padding: 16px; border-bottom: 1px solid #e2e8f0; display: flex; gap: 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #334155; font-weight: normal;">Download Medical Record Documents</h3>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">Select stored documents in your medical file that have been uploaded by your clinical staff or yourself to be downloaded.</p>
                </div>
            </div>
            
        </div>
    </div>
</div>
`;
}
