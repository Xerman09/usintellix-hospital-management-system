import { getUser, clearSession } from "../../core/session.js";
import { renderAvatar } from "../../core/avatar.js";
import { initBranding } from "../../core/branding.js";
import { logout } from "../auth/auth.service.js?v=2";
import { TabManager } from "../../core/tabs.js?v=3";
import { DashboardHomeView } from "./dashboard-home.view.js";
import { getLastActivePatientChart, clearLastActivePatientChart } from "../../core/pending-patient-view.js";
import { setPendingFinderSearch } from "../../core/pending-finder-search.js";
import { showToast } from "../../core/toast.js";
import { initDashboardHome } from "./dashboard-home.js";
import { HelpView } from "../help/help.view.js?v=6";
import { initHelp } from "../help/help.js?v=4";
import { PatientMedicationsView } from "../patient-medications/patient-medications.view.js";
import { initPatientMedications } from "../patient-medications/patient-medications.js";
import { PatientRecallsView } from "../patient-recalls/patient-recalls.view.js";
import { initPatientRecalls } from "../patient-recalls/patient-recalls.js";
import { HealthRemindersView } from "../health-reminders/health-reminders.view.js";
import { initHealthReminders } from "../health-reminders/health-reminders.js";
import { fetchAccessiblePatients, switchPatient } from "../proxy-access/proxy-access.service.js";
import { AddEmployeeView } from "../employees/add-employee.view.js";
import { initAddEmployee } from "../employees/add-employee.js";
import { RoleManagementView } from "../role-management/role-management.view.js";
import { initRoleManagement } from "../role-management/role-management.js";
import { PatientsListView } from "../patients/patients-list.view.js?v=65";
import { initPatientsList, restorePatientChartTab, triggerCreateVisit, triggerCurrentVisit, triggerVisitHistory, triggerRecordsHistory, triggerRecordsRequest, triggerFeeSheet, triggerCheckout } from "../patients/patients-list.js?v=65";
import { BillingManagerView } from "../billing-manager/billing-manager.view.js";
import { initBillingManager } from "../billing-manager/billing-manager.js";
import { BatchPaymentsView } from "../batch-payments/batch-payments.view.js";
import { initBatchPayments } from "../batch-payments/batch-payments.js";
import { EobPostingView } from "../eob-posting/eob-posting.view.js";
import { initEobPosting } from "../eob-posting/eob-posting.js";
import { EdiFilesView } from "../edi-files/edi-files.view.js";
import { initEdiFiles } from "../edi-files/edi-files.js";
import { DrugInventoryView } from "../drug-inventory/drug-inventory.view.js";
import { initDrugInventory } from "../drug-inventory/drug-inventory.js";
import { WarehousesView } from "../warehouses/warehouses.view.js";
import { initWarehouses } from "../warehouses/warehouses.js";
import { DestroyedDrugsView } from "../destroyed-drugs/destroyed-drugs.view.js";
import { initDestroyedDrugs } from "../destroyed-drugs/destroyed-drugs.js";
import { PatientFinderView } from "../patients/patient-finder.view.js";
import { initPatientFinder } from "../patients/patient-finder.js";
import { ManageModulesView } from "../manage-modules/manage-modules.view.js?v=103";
import { initManageModules } from "../manage-modules/manage-modules.js?v=103";
import { CareCoordinationView } from "../care-coordination/care-coordination.view.js?v=105";
import { initCareCoordination } from "../care-coordination/care-coordination.js?v=105";
import { ProvidersView } from "../providers/providers.view.js";
import { initProviders } from "../providers/providers.js";
import { ProviderCategoriesView } from "../provider-categories/provider-categories.view.js";
import { initProviderCategories } from "../provider-categories/provider-categories.js";
import { VisitCategoriesView } from "../visit-categories/visit-categories.view.js";
import { initVisitCategories } from "../visit-categories/visit-categories.js";
import { ProcedureOrderConfigsView } from "../procedure-order-configs/procedure-order-configs.view.js";
import { PracticeRulesView } from "../practice-rules/practice-rules.view.js";
import { initPracticeRules } from "../practice-rules/practice-rules.js";
import { PlansConfigurationView } from "../plans-configuration/plans-configuration.view.js";
import { initPlansConfiguration } from "../plans-configuration/plans-configuration.js";
import { AlertManagerView } from "../alert-manager/alert-manager.view.js";
import { initAlertManager } from "../alert-manager/alert-manager.js";
import { InstallCodeSetView } from "../install-code-set/install-code-set.view.js";
import { initInstallCodeSet } from "../install-code-set/install-code-set.js";
import { ExternalDataLoadsView } from "../external-data-loads/external-data-loads.view.js";
import { initExternalDataLoads } from "../external-data-loads/external-data-loads.js";
import { FormsAdministrationView } from "../forms-administration/forms-administration.view.js";
import { initFormsAdministration } from "../forms-administration/forms-administration.js";
import { DocumentTemplatesView } from "../document-templates/document-templates.view.js";
import { initDocumentTemplates } from "../document-templates/document-templates.js";
import { openTemplateMaintenance } from "../template-maintenance/template-maintenance.js";
import { AclGroupsView } from "../acl-groups/acl-groups.view.js";
import { initAclGroups } from "../acl-groups/acl-groups.js";
import { PatientRemindersView } from "../patient-reminders/patient-reminders.view.js";
import { initPatientReminders } from "../patient-reminders/patient-reminders.js";
import { PatientEducationView } from "../patient-education/patient-education.view.js?v=3";
import { initPatientEducation } from "../patient-education/patient-education.js?v=3";
import { ChartTrackerView } from "../chart-tracker/chart-tracker.view.js?v=2";
import { initChartTracker } from "../chart-tracker/chart-tracker.js?v=2";
import { ReferralFormView } from "../reports/referral-form.view.js";
import { initReferralForm } from "../reports/referral-form.js";
import { ClinicalBlankFormView } from "../reports/clinical-blank-form.view.js";
import { initClinicalBlankForm } from "../reports/clinical-blank-form.js";
import { PatientMergeView } from "../patient-merge/patient-merge.view.js";
import { initPatientMerge } from "../patient-merge/patient-merge.js";
import { PatientDuplicatesView } from "../patient-duplicates/patient-duplicates.view.js";
import { initPatientDuplicates } from "../patient-duplicates/patient-duplicates.js";
import { initProcedureOrderConfigs } from "../procedure-order-configs/procedure-order-configs.js";
import { LoadCompendiumView } from "../procedure-order-configs/load-compendium.view.js";
import { initLoadCompendium } from "../procedure-order-configs/load-compendium.js";
import { VendorsView } from "../vendors/vendors.view.js";
import { initVendors } from "../vendors/vendors.js";
import { ContainerGroupsView } from "../container-groups/container-groups.view.js";
import { initContainerGroups } from "../container-groups/container-groups.js";
import { BatchResultsView } from "../batch-results/batch-results.view.js";
import { initBatchResults } from "../batch-results/batch-results.js";
import { ProcedureReportsView } from "../procedure-reports/procedure-reports.view.js";
import { initProcedureReports } from "../procedure-reports/procedure-reports.js";
import { PatientResultsView } from "../patient-results/patient-results.view.js";
import { initPatientResults } from "../patient-results/patient-results.js";
import { LabsTrendView } from "../labs-trend/labs-trend.view.js";
import { initLabsTrend } from "../labs-trend/labs-trend.js";
import { ClinicalRemindersView } from "../clinical-reminders/clinical-reminders.view.js";
import { initClinicalReminders } from "../clinical-reminders/clinical-reminders.js";
import { LabDocumentsView } from "../lab-documents/lab-documents.view.js";
import { initLabDocuments } from "../lab-documents/lab-documents.js";
import { ScreeningToolsView } from "../screening-tools/screening-tools.view.js";
import { initScreeningTools } from "../screening-tools/screening-tools.js";
import { HolidaysView } from "../holidays/holidays.view.js";
import { initHolidays } from "../holidays/holidays.js";
import { SurgeriesView } from "../surgeries/surgeries.view.js";
import { initSurgeries } from "../surgeries/surgeries.js";
import { PrescriptionCategoriesView } from "../prescription-categories/prescription-categories.view.js";
import { initPrescriptionCategories } from "../prescription-categories/prescription-categories.js";
import { ClassesView } from "../classes/classes.view.js";
import { initClasses } from "../classes/classes.js";
import { VisitTypesView } from "../visit-types/visit-types.view.js";
import { initVisitTypes } from "../visit-types/visit-types.js";
import { FacilitiesView } from "../facilities/facilities.view.js";
import { initFacilities } from "../facilities/facilities.js";
import { FacilityBillingsView } from "../facility-billings/facility-billings.view.js";
import { initFacilityBillings } from "../facility-billings/facility-billings.js";
import { AllergiesView } from "../allergies/allergies.view.js";
import { initAllergies } from "../allergies/allergies.js";
import { MedicalProblemsView } from "../medical-problems/medical-problems.view.js";
import { initMedicalProblems } from "../medical-problems/medical-problems.js";
import { MedicationsView } from "../medications/medications.view.js";
import { initMedications } from "../medications/medications.js";
import { PayerTypesView } from "../payer-types/payer-types.view.js";
import { initPayerTypes } from "../payer-types/payer-types.js";
import { X12PartnersView } from "../x12-partners/x12-partners.view.js";
import { initX12Partners } from "../x12-partners/x12-partners.js";
import { CqmSourceOfPaymentsView } from "../cqm-source-of-payments/cqm-source-of-payments.view.js";
import { initCqmSourceOfPayments } from "../cqm-source-of-payments/cqm-source-of-payments.js";
import { InsurancesView } from "../insurances/insurances.view.js";
import { initInsurances } from "../insurances/insurances.js";
import { OrganizationTypesView } from "../organization-types/organization-types.view.js";
import { initOrganizationTypes } from "../organization-types/organization-types.js";
import { PosCodesView } from "../pos-codes/pos-codes.view.js";
import { initPosCodes } from "../pos-codes/pos-codes.js";
import { PriceLevelsView } from "../price-levels/price-levels.view.js";
import { initPriceLevels } from "../price-levels/price-levels.js";
import { AppointmentsListView } from "../appointments/appointments-list.view.js?v=7";
import { initAppointmentsList } from "../appointments/appointments-list.js?v=7";
import { DoctorCalendarView } from "../appointments/doctor-calendar.view.js?v=7";
import { initDoctorCalendar } from "../appointments/doctor-calendar.js?v=7";
import { PatientAppointmentsView } from "../appointments/patient-appointments.view.js";
import { initPatientAppointments } from "../appointments/patient-appointments.js";
import { HealthSummaryView } from "../health-records/health-summary.view.js?v=2";
import { initHealthSummary } from "../health-records/health-summary.js?v=2";
import { DocumentsView } from "../documents/documents.view.js";
import { initDocuments } from "../documents/documents.js";
import { AppearanceView } from "../appearance/appearance.view.js";
import { initAppearance } from "../appearance/appearance.js";
import { ProfileView } from "../profile/profile.view.js";
import { initProfile } from "../profile/profile.js";
import { BusinessSettingsView } from "../business-settings/business-settings.view.js";
import { initBusinessSettings } from "../business-settings/business-settings.js";
import { GeneralSettingsView } from "../general-settings/general-settings.view.js";
import { initGeneralSettings } from "../general-settings/general-settings.js";
import { PharmaciesView } from "../pharmacies/pharmacies.view.js";
import { initPharmacies } from "../pharmacies/pharmacies.js";
import { RecallsView } from "../recalls/recalls.view.js";
import { initRecalls } from "../recalls/recalls.js";
import { PatientFlowView } from "../patient-flow/patient-flow.view.js";
import { initPatientFlow } from "../patient-flow/patient-flow.js";
import { hasPendingPatientView } from "../../core/pending-patient-view.js";
import { BillingView } from "../billing/billing.view.js";
import { initBilling } from "../billing/billing.js";
import { ReportsView } from "../reports/reports.view.js?v=2";
import { initReports } from "../reports/reports.js?v=2";
import { ClientsListView } from "../reports/clients-list.view.js";
import { initClientsList } from "../reports/clients-list.js";
import { Icd10DiagnosesView } from "../icd10-diagnoses/icd10-diagnoses.view.js";
import { initIcd10Diagnoses } from "../icd10-diagnoses/icd10-diagnoses.js";
import { CvxCodesView } from "../cvx-codes/cvx-codes.view.js";
import { initCvxCodes } from "../cvx-codes/cvx-codes.js";
import { ImmunizationsView } from "../immunizations/immunizations.view.js";
import { initImmunizations } from "../immunizations/immunizations.js";
import { AdministrationRoutesView } from "../administration-routes/administration-routes.view.js";
import { initAdministrationRoutes } from "../administration-routes/administration-routes.js";
import { AdministrationSitesView } from "../administration-sites/administration-sites.view.js";
import { initAdministrationSites } from "../administration-sites/administration-sites.js";
import { AmountUnitsView } from "../amount-units/amount-units.view.js";
import { initAmountUnits } from "../amount-units/amount-units.js";
import { InformationSourcesView } from "../information-sources/information-sources.view.js";
import { initInformationSources } from "../information-sources/information-sources.js";
import { RefusalReasonsView } from "../refusal-reasons/refusal-reasons.view.js";
import { initRefusalReasons } from "../refusal-reasons/refusal-reasons.js";
import { VoidReasonsView } from "../void-reasons/void-reasons.view.js";
import { initVoidReasons } from "../void-reasons/void-reasons.js";
import { CarePlanReasonCodesView } from "../care-plan-reason-codes/care-plan-reason-codes.view.js";
import { initCarePlanReasonCodes } from "../care-plan-reason-codes/care-plan-reason-codes.js";
import { SpecimenSitesView } from "../specimen-sites/specimen-sites.view.js";
import { initSpecimenSites } from "../specimen-sites/specimen-sites.js";
import { SpecimenMethodsView } from "../specimen-methods/specimen-methods.view.js";
import { initSpecimenMethods } from "../specimen-methods/specimen-methods.js";
import { SpecimenTypesView } from "../specimen-types/specimen-types.view.js";
import { initSpecimenTypes } from "../specimen-types/specimen-types.js";
import { SpecimenConditionsView } from "../specimen-conditions/specimen-conditions.view.js";
import { initSpecimenConditions } from "../specimen-conditions/specimen-conditions.js";
import { CompletionStatusesView } from "../completion-statuses/completion-statuses.view.js";
import { initCompletionStatuses } from "../completion-statuses/completion-statuses.js";
import { CqmValuesetsView } from "../cqm-valuesets/cqm-valuesets.view.js";
import { initCqmValuesets } from "../cqm-valuesets/cqm-valuesets.js";
import { PreferenceTypesView } from "../preference-types/preference-types.view.js";
import { initPreferenceTypes } from "../preference-types/preference-types.js";
import { CodesView } from "../codes/codes.view.js";
import { initCodes } from "../codes/codes.js";
import { MessagesView } from "../messages/messages.view.js?v=2";
import { initMessages } from "../messages/messages.js";
import { SettingsView } from "../settings/settings.view.js";
import { initSettings } from "../settings/settings.js";
import { SystemConfigView } from "../system-config/system-config.view.js";
import { initSystemConfig } from "../system-config/system-config.js";
import { initRxReport } from "../reports/rx-report.js";
import { RxReportView } from "../reports/rx-report.view.js";
import { initPatientListCreationReport } from "../reports/patient-list-creation.js";
import { PatientListCreationView } from "../reports/patient-list-creation.view.js";
import { initClinicalReport } from "../reports/clinical.js";
import { ClinicalReportView } from "../reports/clinical.view.js";
import { initReferralsReport } from "../reports/referrals.js";
import { ReferralsReportView } from "../reports/referrals.view.js";
import { initImmunizationRegistry } from "../reports/immunization-registry.js";
import { ImmunizationRegistryView } from "../reports/immunization-registry.view.js";
import { initReportHistory } from "../reports/report-history.js";
import { ReportHistoryView } from "../reports/report-history.view.js";
import { initStandardMeasures } from "../reports/standard-measures.js";
import { StandardMeasuresView } from "../reports/standard-measures.view.js";
import { initAmcMeasures } from "../reports/amc-measures.js";
import { AmcMeasuresView } from "../reports/amc-measures.view.js";
import { initRealWorldTesting } from "../reports/real-world-testing.js";
import { RealWorldTestingView } from "../reports/real-world-testing.view.js";
import { initAlertsLog } from "../reports/alerts-log.js";
import { AlertsLogView } from "../reports/alerts-log.view.js";
import { initIncidentLog } from "../reports/incident-log.js";
import { IncidentLogView } from "../reports/incident-log.view.js";
import { initCriticalTAT } from "../reports/critical-tat.js";
import { CriticalTATView } from "../reports/critical-tat.view.js";
import { initHAISSI } from "../reports/hai-ssi.js";
import { HAISSIView } from "../reports/hai-ssi.view.js";
import { initReadmissionMortality } from "../reports/readmission-mortality.js";
import { ReadmissionMortalityView } from "../reports/readmission-mortality.view.js";
import { initSurgicalSafety } from "../reports/surgical-safety.js";
import { SurgicalSafetyView } from "../reports/surgical-safety.view.js";
import { initOrManagement } from "../or-management/or-management.js";
import { OrManagementView } from "../or-management/or-management.view.js";
import { initInpatientAdmissions } from "../inpatient-admissions/inpatient-admissions.js?v=2";
import { InpatientAdmissionsView } from "../inpatient-admissions/inpatient-admissions.view.js?v=2";
import { initRoomManagement } from "../room-management/room-management.js?v=2";
import { RoomManagementView } from "../room-management/room-management.view.js?v=2";
import { initPrivacyPolicy } from "../privacy-policy/privacy-policy.js?v=1";
import { PrivacyPolicyView } from "../privacy-policy/privacy-policy.view.js?v=1";
import { initTermsConditions } from "../terms-conditions/terms-conditions.js?v=1";
import { TermsConditionsView } from "../terms-conditions/terms-conditions.view.js?v=1";
import { initHipaaAudit } from "../hipaa-audit/hipaa-audit.js?v=1";
import { HipaaAuditView } from "../hipaa-audit/hipaa-audit.view.js?v=1";
import { initSystemDocumentation } from "../system-documentation/system-documentation.js?v=2";
import { SystemDocumentationView } from "../system-documentation/system-documentation.view.js?v=2";
import { initDailySummary } from "../reports/daily-summary.js";
import { DailySummaryView } from "../reports/daily-summary.view.js";
import { initAppointmentsReport } from "../reports/appointments.js";
import { AppointmentsReportView } from "../reports/appointments.view.js";
import { initFlowBoardReport } from "../reports/flow-board.js";
import { FlowBoardReportView } from "../reports/flow-board.view.js";
import { initEncountersReport } from "../reports/encounters.js";
import { EncountersReportView } from "../reports/encounters.view.js";
import { initAppointmentsEncountersReport } from "../reports/appointments-encounters.js";
import { AppointmentsEncountersReportView } from "../reports/appointments-encounters.view.js";
import { initSuperbillReport } from "../reports/superbill.js";
import { SuperbillReportView } from "../reports/superbill.view.js";
import { initEligibilityReport } from "../reports/eligibility.js";
import { EligibilityReportView } from "../reports/eligibility.view.js";
import { initEligibilityResponse } from "../reports/eligibility-response.js";
import { EligibilityResponseView } from "../reports/eligibility-response.view.js";
import { initChartActivityReport } from "../reports/chart-activity.js";
import { ChartActivityReportView } from "../reports/chart-activity.view.js";
import { initChartsOutReport } from "../reports/charts-out.js";
import { ChartsOutReportView } from "../reports/charts-out.view.js";
import { initServicesReport } from "../reports/services.js";
import { ServicesReportView } from "../reports/services.view.js";
import { initSyndromicSurveillanceReport } from "../reports/syndromic-surveillance.js";
import { SyndromicSurveillanceReportView } from "../reports/syndromic-surveillance.view.js";
import { initPendingOrdersReport } from "../reports/pending-res.js";
import { PendingOrdersReportView } from "../reports/pending-res.view.js";
import { initProcedureStatisticsReport } from "../reports/procedures-statistics.js";
import { ProcedureStatisticsReportView } from "../reports/procedures-statistics.view.js";
import { initSalesByItemReport } from "../reports/sales-by-item.js";
import { SalesByItemView } from "../reports/sales-by-item.view.js";
import { initCashReceiptsReport } from "../reports/cash-receipts.js";
import { CashReceiptsView } from "../reports/cash-receipts.view.js";
import { initFrontReceiptsReport } from "../reports/front-receipts.js";
import { FrontReceiptsView } from "../reports/front-receipts.view.js";
import { initReceiptsSummaryReport } from "../reports/receipts-summary.js";
import { ReceiptsSummaryView } from "../reports/receipts-summary.view.js";
import { initCollectionsReport } from "../reports/collections.js";
import { CollectionsView } from "../reports/collections.view.js";
import { initPatientLedgerByDateReport } from "../reports/patient-ledger-by-date.js";
import { PatientLedgerByDateView } from "../reports/patient-ledger-by-date.view.js";
import { initFinancialSummaryServiceCodeReport } from "../reports/financial-summary-service-code.js";
import { FinancialSummaryServiceCodeView } from "../reports/financial-summary-service-code.view.js";
import { initPaymentProcessingReport } from "../reports/payment-processing.js";
import { PaymentProcessingView } from "../reports/payment-processing.view.js";
import { initPrepaymentBalancesReport } from "../reports/prepayment-balances.js";
import { PrepaymentBalancesView } from "../reports/prepayment-balances.view.js";
import { initInventoryListReport } from "../reports/inventory-list.js";
import { InventoryListReportView } from "../reports/inventory-list.view.js";
import { initInventoryActivityReport } from "../reports/inventory-activity.js";
import { InventoryActivityReportView } from "../reports/inventory-activity.view.js";
import { initInventoryTransactionsReport } from "../reports/inventory-transactions.js";
import { InventoryTransactionsReportView } from "../reports/inventory-transactions.view.js";
import { initInsuranceDistributionReport } from "../reports/insurance-distribution.js";
import { InsuranceDistributionView } from "../reports/insurance-distribution.view.js";
import { initIndigentPatientsReport } from "../reports/indigent-patients.js";
import { IndigentPatientsView } from "../reports/indigent-patients.view.js";
import { initUniqueSeenPatientsReport } from "../reports/unique-seen-patients.js";
import { UniqueSeenPatientsView } from "../reports/unique-seen-patients.view.js";
import { openIssuesPopup } from "../patient-issues/patient-issues.js";
import { openExportPopup } from "../patient-export/patient-export.js";
import { openImportPopup } from "../patient-import/patient-import.js";
import { openAppointmentsPopup } from "../popup-appointments/popup-appointments.js";
import { openSuperbillPopup } from "../popup-superbill/popup-superbill.js";
import { initDemographicsForm } from "../reports/demographics-form.js";
import { DemographicsFormView } from "../reports/demographics-form.view.js";
import { initSuperbillForm } from "../reports/superbill-form.js";
import { SuperbillFormView } from "../reports/superbill-form.view.js";
import { initServicesBackgroundReport } from "../reports/services-background.js";
import { ServicesBackgroundView } from "../reports/services-background.view.js";
import { initMessageListReport } from "../reports/message-list.js";
import { MessageListView } from "../reports/message-list.view.js";
import { openPaymentPopup } from "../payment/payment.js";
import { openCheckoutPopup } from "../popup-checkout/popup-checkout.js";
import { openLetterPopup } from "../popup-letter/popup-letter.js";
import { openChartLabelPopup } from "../popup-chart-label/popup-chart-label.js";
import { openBarcodeLabelPopup } from "../popup-barcode-label/popup-barcode-label.js";
import { openAddressLabelPopup } from "../popup-address-label/popup-address-label.js";
import { applyAppearanceSettings } from "../../core/appearance-settings.js";
import { AnnouncementsView } from "../announcements/announcements.view.js";
import { initAnnouncements } from "../announcements/announcements.js";
import { PortalDashboardView } from "../portal-dashboard/portal-dashboard.view.js?v=3";
import { initPortalDashboard } from "../portal-dashboard/portal-dashboard.js?v=3";
import { DicomViewerView } from "../dicom-viewer/dicom-viewer.view.js?v=1";
import { initDicomViewer } from "../dicom-viewer/dicom-viewer.js?v=1";
import { AuthorizationsView } from "../authorizations/authorizations.view.js?v=1";
import { initAuthorizations } from "../authorizations/authorizations.js?v=1";
import { OfficeNotesView } from "../office-notes/office-notes.view.js?v=1";
import { initOfficeNotes } from "../office-notes/office-notes.js?v=1";
import { BatchComView } from "../batch-com/batch-com.view.js?v=3";
import { initBatchCom } from "../batch-com/batch-com.js?v=3";
import { NewDocumentsView } from "../new-documents/new-documents.view.js?v=4";
import { initNewDocuments } from "../new-documents/new-documents.js?v=4";

function renderPlaceholderTab(title) {
    return `
    <div class="placeholder-tab-container">
        <div class="placeholder-icon-wrap">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
        </div>
        <span class="placeholder-badge">Coming Soon</span>
        <h2 class="placeholder-title">${title}</h2>
        <p class="placeholder-desc">This module is currently under development and will be available in an upcoming update.</p>
        <div class="placeholder-card">
            Stay tuned! Our engineering team is finalizing this feature.
        </div>
    </div>
    `;
}

export function Dashboard()
{
    const user = getUser();

    if (!user) {
        window.location.hash = "#/login";
        return;
    }

    const app = document.getElementById("app");

    initBranding();

    // Read saved state BEFORE openTab('dashboard') overwrites it
    const savedStateStr = localStorage.getItem('tabsState');
    let savedState = null;
    if (savedStateStr) {
        try {
            savedState = JSON.parse(savedStateStr);
        } catch(e) {}
    }

    // Initialize the tab manager and expose to window for inline onclicks
    const tabManager = new TabManager('tabBar', 'tabContent');
    window.tabManager = tabManager;

    applyAppearanceSettings();

    // Open default landing tab. Receptionists land on the Calendar
    // instead of the Dashboard -- their nav has no Dashboard link at all.
    if (user.role === 'receptionist') {
        tabManager.openTab('appointments', 'Calendar', () => {
            setTimeout(initAppointmentsList, 0);
            return AppointmentsListView(user);
        });
    } else {
        tabManager.openTab('dashboard', 'Dashboard', () => {
            setTimeout(() => initDashboardHome(user), 0);
            return DashboardHomeView(user);
        });
    }

    // Opens (or, when restoring saved tabs, merely registers) a dashboard
    // tab by id. `activate` controls whether it's actually rendered into
    // the shared tab-content area right now: TabManager.switchTab() swaps
    // that single container's innerHTML synchronously, so restoring
    // several saved tabs must only activate the one that ends up visible
    // -- activating each of them in turn would render, then immediately
    // clobber, every earlier tab's DOM before its deferred init() runs.
    function openDashboardTab(tabId, title, activate = true) {
        window.__openDashboardTab = openDashboardTab;
        // Issues is a global overlay modal (like the reference OpenEMR
        // popup it's named after), not a tab -- it needs to be reachable
        // from whatever tab is currently active, not replace it.
        if (tabId === 'popup_issues') {
            openIssuesPopup();
            return;
        }

        if (tabId === 'popup_export') {
            openExportPopup();
            return;
        }

        if (tabId === 'popup_import') {
            openImportPopup();
            return;
        }

        if (tabId === 'popup_appointments') {
            openAppointmentsPopup();
            return;
        }

        if (tabId === 'popup_superbill') {
            openSuperbillPopup();
            return;
        }

        if (tabId === 'popup_payment') {
            openPaymentPopup();
            return;
        }

        if (tabId === 'popup_checkout') {
            openCheckoutPopup();
            return;
        }

        if (tabId === 'popup_letter') {
            openLetterPopup();
            return;
        }

        if (tabId === 'popup_chart_label') {
            openChartLabelPopup();
            return;
        }

        if (tabId === 'popup_barcode_label') {
            openBarcodeLabelPopup();
            return;
        }

        if (tabId === 'popup_address_label') {
            openAddressLabelPopup();
            return;
        }

        if (tabId === 'patient_dashboard' || tabId === 'patient_visits_history' || tabId === 'patient_records_history' || tabId === 'patient_records_request' || tabId === 'patient_create_visit' || tabId === 'patient_current_visit' || tabId === 'fee_sheet' || tabId === 'checkout') {
            const activePatient = getLastActivePatientChart();
            if (!activePatient || activePatient === "null") {
                showToast("Please select a patient first.", "error");
                return;
            }
            const action = tabId;
            
            // patient_chart doesn't have a standard tab template since it's highly dynamic
            // and managed by patients-list.js. We restore it directly.
            if (activate && tabManager.activeTabId === 'patient_chart') {
                // If we are already on the patient chart, no need to do a full reload/fetch
                if (action === 'patient_create_visit') {
                    triggerCreateVisit();
                } else if (action === 'patient_current_visit') {
                    triggerCurrentVisit();
                } else if (action === 'patient_visits_history') {
                    triggerVisitHistory();
                } else if (action === 'patient_records_history') {
                    triggerRecordsHistory();
                } else if (action === 'patient_records_request') {
                    triggerRecordsRequest();
                } else if (action === 'fee_sheet') {
                    triggerFeeSheet();
                } else if (action === 'checkout') {
                    triggerCheckout();
                } else if (action === 'patient_dashboard') {
                    // For dashboard, there's no specific 'dashboard' view inside patient chart?
                    // Actually there's showChartSection("dashboard");
                    // Assuming that's handled by triggerPatientDashboard() if we created one, or we can just ignore since default is dashboard.
                    // Let's implement triggerPatientDashboard() or just do nothing (it's already handled if we restore).
                }
            } else {
                restorePatientChartTab(activate).then(() => {
                    if (action === 'patient_create_visit') {
                        setTimeout(() => triggerCreateVisit(), 200);
                    } else if (action === 'patient_current_visit') {
                        setTimeout(() => triggerCurrentVisit(), 200);
                    } else if (action === 'patient_visits_history') {
                        setTimeout(() => triggerVisitHistory(), 200);
                    } else if (action === 'patient_records_history') {
                        setTimeout(() => triggerRecordsHistory(), 200);
                    } else if (action === 'patient_records_request') {
                        setTimeout(() => triggerRecordsRequest(), 200);
                    } else if (action === 'fee_sheet') {
                        setTimeout(() => triggerFeeSheet(), 200);
                    } else if (action === 'checkout') {
                        setTimeout(() => triggerCheckout(), 200);
                    }
                });
            }
            return;
        }

        if (tabId === 'patients') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientsList, 0);
                return PatientsListView(user);
            }, activate);
        } else if (tabId === 'patient_finder') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientFinder, 0);
                return PatientFinderView();
            }, activate);
        } else if (tabId === 'employees') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAddEmployee, 0);
                return AddEmployeeView();
            }, activate);
        } else if (tabId === 'role_management') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initRoleManagement, 0);
                return RoleManagementView();
            }, activate);
        } else if (tabId === 'providers') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProviders, 0);
                return ProvidersView();
            }, activate);
        } else if (tabId === 'billing_manager') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initBillingManager, 0);
                return BillingManagerView();
            }, activate);
        } else if (tabId === 'payment' || tabId === 'batch_payments') {
            // Both nav entries open the same real OpenEMR "Payments" screen
            // (New Payment/Search Payment/ERA Posting) -- "Batch Payments"
            // isn't a separate feature there, it's the name of the entry
            // form on the New Payment tab, so there's nothing distinct to
            // build for it as its own page.
            tabManager.openTab('payment', 'Payments', () => {
                setTimeout(initBatchPayments, 0);
                return BatchPaymentsView();
            }, activate);
        } else if (tabId === 'posting_payments') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initEobPosting, 0);
                return EobPostingView();
            }, activate);
        } else if (tabId === 'edi_history') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initEdiFiles, 0);
                return EdiFilesView();
            }, activate);
        } else if (tabId === 'inventory_management') {
            tabManager.openTab(tabId, 'Drug Inventory', () => {
                setTimeout(initDrugInventory, 0);
                return DrugInventoryView();
            }, activate);
        } else if (tabId === 'inventory_warehouses') {
            tabManager.openTab(tabId, 'Manage Warehouses', () => {
                setTimeout(initWarehouses, 0);
                return WarehousesView();
            }, activate);
        } else if (tabId === 'inventory_destroyed') {
            tabManager.openTab(tabId, 'Destroyed Drugs', () => {
                setTimeout(initDestroyedDrugs, 0);
                return DestroyedDrugsView();
            }, activate);
        } else if (tabId === 'provider_categories') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProviderCategories, 0);
                return ProviderCategoriesView();
            }, activate);
        } else if (tabId === 'visit_categories') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initVisitCategories, 0);
                return VisitCategoriesView();
            }, activate);
        } else if (tabId === 'procedure_configuration') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProcedureOrderConfigs, 0);
                return ProcedureOrderConfigsView();
            }, activate);
        } else if (tabId === 'procedure_load_compendium') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initLoadCompendium, 0);
                return LoadCompendiumView();
            }, activate);
        } else if (tabId === 'vendor_management') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initVendors, 0);
                return VendorsView();
            }, activate);
        } else if (tabId === 'container_group_management') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initContainerGroups, 0);
                return ContainerGroupsView();
            }, activate);
        } else if (tabId === 'procedure_batch_results') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initBatchResults, 0);
                return BatchResultsView();
            }, activate);
        } else if (tabId === 'procedure_electronic_reports') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(() => initProcedureReports(), 0);
                return ProcedureReportsView();
            }, activate);
        } else if (tabId === 'procedure_pending_review') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(() => initProcedureReports({ defaultCurrentPatientOnly: true, defaultStatus: 'pending' }), 0);
                return ProcedureReportsView();
            }, activate);
        } else if (tabId === 'procedure_patient_results') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientResults, 0);
                return PatientResultsView();
            }, activate);
        } else if (tabId === 'procedure_lab_overview') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initLabsTrend, 0);
                return LabsTrendView();
            }, activate);
        } else if (tabId === 'clinical_reminders') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initClinicalReminders, 0);
                return ClinicalRemindersView();
            }, activate);
        } else if (tabId === 'procedure_lab_documents') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initLabDocuments, 0);
                return LabDocumentsView();
            }, activate);
        } else if (tabId === 'screening_tools') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initScreeningTools, 0);
                return ScreeningToolsView();
            }, activate);
        } else if (tabId === 'admin_manage_duplicates') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientDuplicates, 0);
                return PatientDuplicatesView();
            }, activate);
        } else if (tabId === 'admin_merge_patients') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientMerge, 0);
                return PatientMergeView();
            }, activate);
        } else if (tabId === 'admin_patient_reminders') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientReminders, 0);
                return PatientRemindersView();
            }, activate);
        } else if (tabId === 'misc_announcements') {
            tabManager.openTab(tabId, title || 'Announcements', () => {
                setTimeout(() => initAnnouncements(user), 0);
                return AnnouncementsView(user);
            }, activate);
        } else if (tabId === 'misc_portal_dashboard') {
            tabManager.openTab(tabId, title || 'Portal Dashboard', () => {
                setTimeout(initPortalDashboard, 0);
                return PortalDashboardView();
            }, activate);
        } else if (tabId === 'misc_dicom_viewer') {
            tabManager.openTab(tabId, title || 'Dicom Viewer', () => {
                setTimeout(initDicomViewer, 0);
                return DicomViewerView();
            }, activate);
        } else if (tabId === 'misc_patient_education') {
            tabManager.openTab(tabId, 'Web Search - Patient Education Materials', () => {
                setTimeout(initPatientEducation, 0);
                return PatientEducationView();
            }, activate);
        } else if (tabId === 'misc_authorizations') {
            tabManager.openTab(tabId, title || 'Authorizations', () => {
                setTimeout(initAuthorizations, 0);
                return AuthorizationsView();
            }, activate);
        } else if (tabId === 'misc_chart_tracker') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initChartTracker, 0);
                return ChartTrackerView();
            }, activate);
        } else if (tabId === 'misc_office_notes') {
            tabManager.openTab(tabId, title || 'Office Notes', () => {
                setTimeout(initOfficeNotes, 0);
                return OfficeNotesView();
            }, activate);
        } else if (tabId === 'misc_batch_com') {
            tabManager.openTab(tabId, title || 'Batch Communication Tool', () => {
                setTimeout(initBatchCom, 0);
                return BatchComView();
            }, activate);
        } else if (tabId === 'misc_new_documents') {
            tabManager.openTab(tabId, title || 'New Documents', () => {
                setTimeout(initNewDocuments, 0);
                return NewDocumentsView();
            }, activate);
        } else if (tabId === 'misc_blank_forms_referral') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initReferralForm, 0);
                return ReferralFormView();
            }, activate);
        } else if (tabId.startsWith('blank_forms_clinical_')) {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initClinicalBlankForm, 0);
                return ClinicalBlankFormView(title);
            }, activate);
        } else if (tabId === 'admin_practice_rules') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPracticeRules, 0);
                return PracticeRulesView();
            }, activate);
        } else if (tabId === 'admin_plans_configuration') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPlansConfiguration, 0);
                return PlansConfigurationView();
            }, activate);
        } else if (tabId === 'admin_alert_manager') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAlertManager, 0);
                return AlertManagerView();
            }, activate);
        } else if (tabId === 'admin_coding_native_data_loads') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInstallCodeSet, 0);
                return InstallCodeSetView();
            }, activate);
        } else if (tabId === 'admin_coding_external_data_loads') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initExternalDataLoads, 0);
                return ExternalDataLoadsView();
            }, activate);
        } else if (tabId === 'admin_forms_administration') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFormsAdministration, 0);
                return FormsAdministrationView();
            }, activate);
        } else if (tabId === 'admin_document_templates') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initDocumentTemplates, 0);
                return DocumentTemplatesView();
            }, activate);
        } else if (tabId === 'template_maintenance') {
            openTemplateMaintenance();
        } else if (tabId === 'admin_acl_administration') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAclGroups, 0);
                return AclGroupsView();
            }, activate);
        } else if (tabId === 'admin_clinic_import_holidays') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initHolidays, 0);
                return HolidaysView();
            }, activate);
        } else if (tabId === 'surgeries') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSurgeries, 0);
                return SurgeriesView();
            }, activate);
        } else if (tabId === 'classes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initClasses, 0);
                return ClassesView();
            }, activate);
        } else if (tabId === 'visit_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initVisitTypes, 0);
                return VisitTypesView();
            }, activate);
        } else if (tabId === 'facilities') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFacilities, 0);
                return FacilitiesView();
            }, activate);
        } else if (tabId === 'facility_billings') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFacilityBillings, 0);
                return FacilityBillingsView();
            }, activate);
        } else if (tabId === 'allergies') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAllergies, 0);
                return AllergiesView();
            }, activate);
        } else if (tabId === 'medical_problems') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initMedicalProblems, 0);
                return MedicalProblemsView();
            }, activate);
        } else if (tabId === 'medication_management') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initMedications, 0);
                return MedicationsView();
            }, activate);
        } else if (tabId === 'prescription_categories') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPrescriptionCategories, 0);
                return PrescriptionCategoriesView();
            }, activate);
        } else if (tabId === 'payer_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPayerTypes, 0);
                return PayerTypesView();
            }, activate);
        } else if (tabId === 'x12_partners') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initX12Partners, 0);
                return X12PartnersView();
            }, activate);
        } else if (tabId === 'cqm_source_of_payments') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCqmSourceOfPayments, 0);
                return CqmSourceOfPaymentsView();
            }, activate);
        } else if (tabId === 'insurances') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInsurances, 0);
                return InsurancesView();
            }, activate);
        } else if (tabId === 'organization_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initOrganizationTypes, 0);
                return OrganizationTypesView();
            }, activate);
        } else if (tabId === 'pos_codes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPosCodes, 0);
                return PosCodesView();
            }, activate);
        } else if (tabId === 'price_levels') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPriceLevels, 0);
                return PriceLevelsView();
            }, activate);
        } else if (tabId === 'icd10_diagnoses') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initIcd10Diagnoses, 0);
                return Icd10DiagnosesView();
            }, activate);
        } else if (tabId === 'cvx_codes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCvxCodes, 0);
                return CvxCodesView();
            }, activate);
        } else if (tabId === 'immunizations') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initImmunizations, 0);
                return ImmunizationsView();
            }, activate);
        } else if (tabId === 'administration_routes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAdministrationRoutes, 0);
                return AdministrationRoutesView();
            }, activate);
        } else if (tabId === 'administration_sites') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAdministrationSites, 0);
                return AdministrationSitesView();
            }, activate);
        } else if (tabId === 'amount_units') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAmountUnits, 0);
                return AmountUnitsView();
            }, activate);
        } else if (tabId === 'information_sources') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInformationSources, 0);
                return InformationSourcesView();
            }, activate);
        } else if (tabId === 'refusal_reasons') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initRefusalReasons, 0);
                return RefusalReasonsView();
            }, activate);
        } else if (tabId === 'void_reasons') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initVoidReasons, 0);
                return VoidReasonsView();
            }, activate);
        } else if (tabId === 'care_plan_reason_codes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCarePlanReasonCodes, 0);
                return CarePlanReasonCodesView();
            }, activate);
        } else if (tabId === 'specimen_sites') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSpecimenSites, 0);
                return SpecimenSitesView();
            }, activate);
        } else if (tabId === 'specimen_methods') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSpecimenMethods, 0);
                return SpecimenMethodsView();
            }, activate);
        } else if (tabId === 'specimen_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSpecimenTypes, 0);
                return SpecimenTypesView();
            }, activate);
        } else if (tabId === 'specimen_conditions') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSpecimenConditions, 0);
                return SpecimenConditionsView();
            }, activate);
        } else if (tabId === 'completion_statuses') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCompletionStatuses, 0);
                return CompletionStatusesView();
            }, activate);
        } else if (tabId === 'cqm_valuesets') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCqmValuesets, 0);
                return CqmValuesetsView();
            }, activate);
        } else if (tabId === 'preference_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPreferenceTypes, 0);
                return PreferenceTypesView();
            }, activate);
        } else if (tabId === 'codes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCodes, 0);
                return CodesView();
            }, activate);
        } else if (tabId === 'appointments' && user.role === 'doctor') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initDoctorCalendar, 0);
                return DoctorCalendarView();
            }, activate);
        } else if (tabId === 'appointments' && ['admin', 'receptionist'].includes(user.role)) {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAppointmentsList, 0);
                return AppointmentsListView(user);
            }, activate);
        } else if (tabId === 'appointments' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientAppointments, 0);
                return PatientAppointmentsView();
            }, activate);
        } else if (tabId === 'messaging') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initMessages, 0);
                return MessagesView();
            }, activate);
        } else if (tabId === 'recalls') {
            tabManager.openTab(tabId, title, () => {
                if (user.role === 'patient') {
                    setTimeout(initPatientRecalls, 0);
                    return PatientRecallsView();
                }

                setTimeout(initRecalls, 0);
                return RecallsView();
            }, activate);
        } else if (tabId === 'patient_flow') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientFlow, 0);
                return PatientFlowView();
            }, activate);
        } else if (tabId === 'profile') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProfile, 0);
                return ProfileView();
            }, activate);
        } else if (tabId === 'business_settings' && user.role === 'admin') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initBusinessSettings, 0);
                return BusinessSettingsView();
            }, activate);
        } else if (tabId === 'pharmacies' && user.role === 'admin') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPharmacies, 0);
                return PharmaciesView();
            }, activate);
        } else if (tabId === 'general_settings' && user.role === 'admin') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initGeneralSettings, 0);
                return GeneralSettingsView();
            }, activate);
        } else if (tabId === 'health_records' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(() => initHealthSummary({}), 0);
                return HealthSummaryView();
            }, activate);
        } else if (tabId === 'documents' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initDocuments, 0);
                return DocumentsView();
            }, activate);
        } else if (tabId === 'billing' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initBilling, 0);
                return BillingView();
            }, activate);
        } else if (tabId === 'medications' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientMedications, 0);
                return PatientMedicationsView();
            }, activate);
        } else if (tabId === 'reports' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initReports, 0);
                return ReportsView();
            }, activate);
        } else if (tabId === 'health_reminders' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initHealthReminders, 0);
                return HealthRemindersView();
            }, activate);
        } else if (tabId === 'clients_list') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initClientsList, 0);
                return ClientsListView();
            }, activate);
        } else if (tabId === 'clients_rx') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initRxReport, 0);
                return RxReportView();
            }, activate);
        } else if (tabId === 'patient_list_creation') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientListCreationReport, 0);
                return PatientListCreationView();
            }, activate);
        } else if (tabId === 'clinical_reports') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initClinicalReport, 0);
                return ClinicalReportView();
            }, activate);
        } else if (tabId === 'referrals' || tabId === 'referrals_reports') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initReferralsReport, 0);
                return ReferralsReportView();
            }, activate);
        } else if (tabId === 'immunization_registry') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initImmunizationRegistry, 0);
                return ImmunizationRegistryView();
            }, activate);
        } else if (tabId === 'clinic_report_results') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initReportHistory, 0);
                return ReportHistoryView();
            }, activate);
        } else if (tabId === 'clinic_standard_measures') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initStandardMeasures, 0);
                return StandardMeasuresView();
            }, activate);
        } else if (tabId === 'clinic_automated_measures') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAmcMeasures, 0);
                return AmcMeasuresView();
            }, activate);
        } else if (tabId === 'clinic_real_world_testing') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initRealWorldTesting, 0);
                return RealWorldTestingView();
            }, activate);
        } else if (tabId === 'clinic_alerts_log') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAlertsLog, 0);
                return AlertsLogView();
            }, activate);
        } else if (tabId === 'clinic_incident_log') {
            tabManager.openTab(tabId, title || 'Incident & Adverse Events', () => {
                setTimeout(initIncidentLog, 0);
                return IncidentLogView();
            }, activate);
        } else if (tabId === 'clinic_critical_tat') {
            tabManager.openTab(tabId, title || 'Critical Diagnostic TAT', () => {
                setTimeout(initCriticalTAT, 0);
                return CriticalTATView();
            }, activate);
        } else if (tabId === 'clinic_hai_ssi') {
            tabManager.openTab(tabId, title || 'HAI & SSI Infections', () => {
                setTimeout(initHAISSI, 0);
                return HAISSIView();
            }, activate);
        } else if (tabId === 'clinic_readmission_mortality') {
            tabManager.openTab(tabId, title || '30-Day Readmission & Mortality', () => {
                setTimeout(initReadmissionMortality, 0);
                return ReadmissionMortalityView();
            }, activate);
        } else if (tabId === 'clinic_surgical_safety') {
            tabManager.openTab(tabId, title || 'Surgical Safety & Time-Out', () => {
                setTimeout(initSurgicalSafety, 0);
                return SurgicalSafetyView();
            }, activate);
        } else if (tabId === 'reports_visits_daily') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initDailySummary, 0);
                return DailySummaryView();
            }, activate);
        } else if (tabId === 'reports_visits_appointments') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAppointmentsReport, 0);
                return AppointmentsReportView();
            }, activate);
        } else if (tabId === 'reports_visits_flow_board') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFlowBoardReport, 0);
                return FlowBoardReportView();
            }, activate);
        } else if (tabId === 'reports_visits_encounters') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initEncountersReport, 0);
                return EncountersReportView();
            }, activate);
        } else if (tabId === 'reports_visits_appt_enc') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAppointmentsEncountersReport, 0);
                return AppointmentsEncountersReportView();
            }, activate);
        } else if (tabId === 'reports_visits_superbill') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSuperbillReport, 0);
                return SuperbillReportView();
            }, activate);
        } else if (tabId === 'reports_visits_eligibility') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initEligibilityReport, 0);
                return EligibilityReportView();
            }, activate);
        } else if (tabId === 'reports_visits_eligibility_response') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initEligibilityResponse, 0);
                return EligibilityResponseView();
            }, activate);
        } else if (tabId === 'reports_visits_chart_activity') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initChartActivityReport, 0);
                return ChartActivityReportView();
            }, activate);
        } else if (tabId === 'reports_visits_charts_out') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initChartsOutReport, 0);
                return ChartsOutReportView();
            }, activate);
        } else if (tabId === 'reports_visits_services') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initServicesReport, 0);
                return ServicesReportView();
            }, activate);
        } else if (tabId === 'reports_visits_syndromic_surveillance') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSyndromicSurveillanceReport, 0);
                return SyndromicSurveillanceReportView();
            }, activate);
        } else if (tabId === 'reports_procedures_pending_res') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPendingOrdersReport, 0);
                return PendingOrdersReportView();
            }, activate);
        } else if (tabId === 'reports_procedures_statistics') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProcedureStatisticsReport, 0);
                return ProcedureStatisticsReportView();
            }, activate);
        } else if (tabId === 'reports_financial_sales') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSalesByItemReport, 0);
                return SalesByItemView();
            }, activate);
        } else if (tabId === 'reports_financial_cash_rec') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCashReceiptsReport, 0);
                return CashReceiptsView();
            }, activate);
        } else if (tabId === 'reports_financial_front_rec') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFrontReceiptsReport, 0);
                return FrontReceiptsView();
            }, activate);
        } else if (tabId === 'reports_financial_pmt_method') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initReceiptsSummaryReport, 0);
                return ReceiptsSummaryView();
            }, activate);
        } else if (tabId === 'reports_financial_collections') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCollectionsReport, 0);
                return CollectionsView();
            }, activate);
        } else if (tabId === 'reports_financial_pat_ledger') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientLedgerByDateReport, 0);
                return PatientLedgerByDateView();
            }, activate);
        } else if (tabId === 'reports_financial_summary_service_code') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFinancialSummaryServiceCodeReport, 0);
                return FinancialSummaryServiceCodeView();
            }, activate);
        } else if (tabId === 'reports_financial_payment_processing') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPaymentProcessingReport, 0);
                return PaymentProcessingView();
            }, activate);
        } else if (tabId === 'reports_financial_prepayment_balances') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPrepaymentBalancesReport, 0);
                return PrepaymentBalancesView();
            }, activate);
        } else if (tabId === 'reports_inventory_list') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInventoryListReport, 0);
                return InventoryListReportView();
            }, activate);
        } else if (tabId === 'reports_inventory_activity') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInventoryActivityReport, 0);
                return InventoryActivityReportView();
            }, activate);
        } else if (tabId === 'reports_inventory_transactions') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInventoryTransactionsReport, 0);
                return InventoryTransactionsReportView();
            }, activate);
        } else if (tabId === 'reports_insurance_distribution') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInsuranceDistributionReport, 0);
                return InsuranceDistributionView();
            }, activate);
        } else if (tabId === 'reports_insurance_indigents') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initIndigentPatientsReport, 0);
                return IndigentPatientsView();
            }, activate);
        } else if (tabId === 'reports_insurance_unique_sp') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initUniqueSeenPatientsReport, 0);
                return UniqueSeenPatientsView();
            }, activate);
        } else if (tabId === 'blank_forms_core_demographics') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initDemographicsForm, 0);
                return DemographicsFormView();
            }, activate);
        } else if (tabId === 'blank_forms_core_superbill') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSuperbillForm, 0);
                return SuperbillFormView();
            }, activate);
        } else if (tabId === 'services_background') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initServicesBackgroundReport, 0);
                return ServicesBackgroundView();
            }, activate);
        } else if (tabId === 'message_list') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initMessageListReport, 0);
                return MessageListView();
            }, activate);
        } else if (tabId === 'settings') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSettings, 0);
                return SettingsView();
            }, activate);
        } else if (tabId === 'global_settings') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initSystemConfig, 0);
                return SystemConfigView();
            }, activate);
        } else if (tabId === 'help') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initHelp, 0);
                return HelpView();
            }, activate);
        } else if (tabId === 'manage_modules') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initManageModules, 0);
                return ManageModulesView();
            }, activate);
        } else if (tabId === 'carecoordination') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCareCoordination, 0);
                return CareCoordinationView();
            }, activate);
        } else if (tabId === 'or_management') {
            tabManager.openTab(tabId, title || 'Operating Room (OR) Management', () => {
                setTimeout(initOrManagement, 0);
                return OrManagementView();
            }, activate);
        } else if (tabId === 'inpatient_admissions') {
            tabManager.openTab(tabId, title || 'Inpatient Bed Management (ADT)', () => {
                setTimeout(() => initInpatientAdmissions(user), 0);
                return InpatientAdmissionsView();
            }, activate);
        } else if (tabId === 'room_management') {
            tabManager.openTab(tabId, title || 'Room & Bed Management', () => {
                setTimeout(() => initRoomManagement(user), 0);
                return RoomManagementView(user);
            }, activate);
        } else if (tabId === 'privacy_policy') {
            tabManager.openTab(tabId, title || 'Privacy Policy & HIPAA Notice', () => {
                setTimeout(initPrivacyPolicy, 0);
                return PrivacyPolicyView({ isTab: true });
            }, activate);
        } else if (tabId === 'terms_conditions') {
            tabManager.openTab(tabId, title || 'Terms & Conditions of Service', () => {
                setTimeout(initTermsConditions, 0);
                return TermsConditionsView({ isTab: true });
            }, activate);
        } else if (tabId === 'hipaa_audit' || tabId === 'admin_system_logs' || tabId === 'admin_system_audit_log_tamper') {
            tabManager.openTab(tabId, title || 'HIPAA Audit Logs & Integrity', () => {
                setTimeout(initHipaaAudit, 0);
                return HipaaAuditView();
            }, activate);
        } else if (tabId === 'system_documentation' || tabId === 'system_docs') {
            tabManager.openTab(tabId, title || 'System Documentation', () => {
                setTimeout(initSystemDocumentation, 0);
                return SystemDocumentationView({ isTab: true });
            }, activate);
        } else {
            tabManager.openTab(tabId, title, () => renderPlaceholderTab(title), activate);
        }
    }

    window.__openDashboardTab = openDashboardTab;

    // Attach navigation listeners
    const navLinks = document.querySelectorAll('#navbarLinks a[data-tab]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.classList.contains('disabled-nav-link')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            const title = link.textContent.trim();

            openDashboardTab(tabId, title);
        });
    });

    // Top navbar "Search by any demographic..." box -- pressing Enter hands
    // the typed term off to the Finder tab (same one-shot localStorage
    // mailbox pattern already used to hand a patient off to the Patients
    // tab, see pending-patient-view.js) and opens/switches to it, so it
    // runs a real search immediately instead of just sitting there.
    const navSearchInput = document.querySelector('.nav-search');
    if (navSearchInput) {
        navSearchInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;

            const term = navSearchInput.value.trim();
            if (!term) return;

            setPendingFinderSearch(term);
            openDashboardTab('patient_finder', 'Finder');
            navSearchInput.value = '';
            navSearchInput.blur();
        });
    }

    function updatePatientNavState() {
        const activePatient = getLastActivePatientChart();
        const isPatientActive = activePatient && activePatient !== "null";
        const patientLinks = document.querySelectorAll('.patient-dependent-nav');
        
        patientLinks.forEach(link => {
            if (isPatientActive) {
                link.classList.remove('disabled-nav-link');
                link.style.opacity = '1';
                link.style.cursor = 'pointer';
            } else {
                link.classList.add('disabled-nav-link');
                link.style.opacity = '0.5';
                link.style.cursor = 'not-allowed';
            }
        });
    }

    // Initialize nav state and listen for changes
    updatePatientNavState();
    window.addEventListener('activePatientChanged', updatePatientNavState);

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModalOverlay = document.getElementById('logoutConfirmModalOverlay');

    if (logoutBtn && logoutModalOverlay) {
        const closeLogoutModal = () => logoutModalOverlay.classList.remove('open');

        logoutBtn.addEventListener('click', () => {
            logoutModalOverlay.classList.add('open');
        });

        document.getElementById('closeLogoutConfirmModal').addEventListener('click', closeLogoutModal);
        document.getElementById('cancelLogoutBtn').addEventListener('click', closeLogoutModal);
        logoutModalOverlay.addEventListener('click', (event) => {
            if (event.target === logoutModalOverlay) {
                closeLogoutModal();
            }
        });

        const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

        confirmLogoutBtn.addEventListener('click', async () => {
            // Disable immediately -- clicking again before the request
            // resolves (e.g. because the session already died and there's
            // no visible feedback yet) would otherwise fire a second,
            // redundant /logout request.
            confirmLogoutBtn.disabled = true;

            await logout();
            clearSession();
            clearLastActivePatientChart();
            window.location.hash = "#/login";
        });
    }

    // Profile Tab Hook
    const profileBtn = document.querySelector('a[data-tab="profile"]');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openDashboardTab('profile', 'Profile');
        });
    }

    // Settings Tab Hook
    const settingsBtn = document.querySelector('a[data-tab="settings"]');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openDashboardTab('settings', 'Settings');
        });
    }

    // Appearance Tab Hook
    const appearanceBtn = document.querySelector('a[data-tab="appearance"]');
    if (appearanceBtn) {
        appearanceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            tabManager.openTab('appearance', 'Appearance', () => {
                setTimeout(initAppearance, 0);
                return AppearanceView();
            });
        });
    }

    // Profile dropdown: click-to-toggle instead of CSS hover, so moving the
    // mouse from the avatar down to a menu item can't cause it to close
    // mid-click (a hover-only dropdown is fragile to real mouse movement).
    const navProfile = document.querySelector('.nav-profile');
    const avatarEl = document.getElementById('avatarLetter');

    if (navProfile && avatarEl) {
        avatarEl.addEventListener('click', (e) => {
            e.stopPropagation();
            navProfile.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!navProfile.contains(e.target)) {
                navProfile.classList.remove('open');
            }
        });

        navProfile.querySelectorAll('.dropdown-content a').forEach((link) => {
            link.addEventListener('click', () => {
                navProfile.classList.remove('open');
            });
        });
    }

    // Set avatar and profile details
    renderAvatar(document.getElementById('avatarLetter'), user);
    
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = `${user.first_name} ${user.last_name}` || "User";
    
    const profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.textContent = user.role || "patient";

    if (user.role === 'patient') {
        setupProxySwitcher();
    }

    // Restore tabs from the state we saved before initialization. Only the
    // tab that ends up active is actually rendered+initialized; the rest
    // are just re-registered in the tab bar (see openDashboardTab above).
    if (savedState) {
        try {
            if (savedState.tabs) {
                savedState.tabs.forEach(tabId => {
                    if (tabId === 'dashboard') return;
                    if (tabId === 'patient_chart') {
                        if (savedState.active !== 'patient_chart') restorePatientChartTab(false);
                        return;
                    }
                    const link = document.querySelector(`a[data-tab="${tabId}"]`);
                    if (link) openDashboardTab(tabId, link.textContent.trim(), false);
                });
            }
            if (savedState.active) {
                if (savedState.active === 'dashboard') {
                    tabManager.switchTab('dashboard');
                } else if (savedState.active === 'patient_chart') {
                    restorePatientChartTab(true);
                } else {
                    const activeLink = document.querySelector(`a[data-tab="${savedState.active}"]`);
                    if (activeLink) openDashboardTab(savedState.active, activeLink.textContent.trim(), true);
                }
            }
        } catch(e) {
            console.error('Failed to restore tabs:', e);
        }
    }

    // A Flow-board "open patient in new window" click leaves a pending
    // patient chart request for this fresh window to pick up -- jump
    // straight to the Patients tab so its own init can consume it.
    if (hasPendingPatientView()) {
        openDashboardTab('patients', 'Patients');
    }

    setupPasswordExpirationBanner(user, openDashboardTab);
}

function setupPasswordExpirationBanner(user, openDashboardTab) {
    if (!user || !user.password_expiring_soon) {
        return;
    }

    if (sessionStorage.getItem('pw_exp_banner_dismissed') === '1') {
        return;
    }

    const bannerEl = document.getElementById('passwordExpirationBanner');
    if (!bannerEl) return;

    const days = user.days_until_expiration ?? 7;
    const dayText = days === 1 ? '1 day' : `${days} days`;

    bannerEl.innerHTML = `
        <div class="password-expiration-warning-banner" style="display: flex; align-items: center; justify-content: space-between; background: #fffbeb; border-bottom: 1px solid #fde68a; color: #92400e; padding: 10px 24px; font-size: 13px; z-index: 10; position: relative;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #d97706;">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span><strong>HIPAA Security Notice (§ 164.308(a)(5)(ii)(D)):</strong> Your password will expire in <strong>${escapeHtmlBasic(dayText)}</strong>. Please update your credentials to avoid disruption.</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                <button type="button" id="btnBannerUpdatePassword" style="background: #d97706; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Update Password</button>
                <button type="button" id="btnBannerDismiss" style="background: none; border: none; color: #b45309; font-size: 20px; line-height: 1; cursor: pointer; padding: 0 4px;" aria-label="Dismiss">&times;</button>
            </div>
        </div>
    `;
    bannerEl.style.display = 'block';

    const updateBtn = document.getElementById('btnBannerUpdatePassword');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            openDashboardTab('profile', 'Profile');
        });
    }

    const dismissBtn = document.getElementById('btnBannerDismiss');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            bannerEl.style.display = 'none';
            sessionStorage.setItem('pw_exp_banner_dismissed', '1');
        });
    }
}

/**
 * Populates and wires the "Viewing: X" proxy switcher in the navbar.
 * Stays hidden entirely for patients with no proxy access (the common
 * case) -- it only appears once there's more than one chart to choose
 * from (the patient's own, plus any active proxy grants).
 */
async function setupProxySwitcher() {
    const switcherEl = document.getElementById('proxySwitcher');
    const labelEl = document.getElementById('proxySwitcherLabel');
    const menuEl = document.getElementById('proxySwitcherMenu');

    if (!switcherEl || !labelEl || !menuEl) return;

    try {
        const result = await fetchAccessiblePatients();

        if (!result.success || !Array.isArray(result.data) || result.data.length < 2) {
            return;
        }

        const active = result.data.find((p) => p.is_active) || result.data[0];

        labelEl.innerHTML = `Viewing: <strong>${escapeHtmlBasic(active.first_name)}</strong>`;

        menuEl.innerHTML = result.data.map((p) => `
            <a href="#" data-patient-id="${p.patient_id}" class="${p.is_active ? 'proxy-switcher-active' : ''}">
                ${escapeHtmlBasic(p.first_name)} ${escapeHtmlBasic(p.last_name)}
                <span style="display: block; font-size: 11px; opacity: .7;">${escapeHtmlBasic(p.relationship)}</span>
            </a>
        `).join('');

        menuEl.querySelectorAll('a[data-patient-id]').forEach((link) => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();

                const patientId = parseInt(link.getAttribute('data-patient-id'), 10);

                if (link.classList.contains('proxy-switcher-active')) return;

                const switchResult = await switchPatient(patientId);

                if (switchResult.success) {
                    window.location.reload();
                }
            });
        });

        switcherEl.style.display = 'flex';
    } catch (error) {
        console.error('Failed to load proxy access list', error);
    }
}

function escapeHtmlBasic(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}
