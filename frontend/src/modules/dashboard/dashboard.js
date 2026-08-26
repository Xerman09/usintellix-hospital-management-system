import { getUser, clearSession } from "../../core/session.js";
import { renderAvatar } from "../../core/avatar.js";
import { initBranding } from "../../core/branding.js";
import { logout } from "../auth/auth.service.js?v=2";
import { TabManager } from "../../core/tabs.js?v=2";
import { DashboardHomeView } from "./dashboard-home.view.js";
import { initDashboardHome } from "./dashboard-home.js";
import { HelpView } from "../help/help.view.js";
import { initHelp } from "../help/help.js";
import { PatientMedicationsView } from "../patient-medications/patient-medications.view.js";
import { initPatientMedications } from "../patient-medications/patient-medications.js";
import { AddEmployeeView } from "../employees/add-employee.view.js";
import { initAddEmployee } from "../employees/add-employee.js";
import { RoleManagementView } from "../role-management/role-management.view.js";
import { initRoleManagement } from "../role-management/role-management.js";
import { PatientsListView } from "../patients/patients-list.view.js?v=45";
import { initPatientsList, restorePatientChartTab } from "../patients/patients-list.js?v=45";
import { PatientFinderView } from "../patients/patient-finder.view.js";
import { initPatientFinder } from "../patients/patient-finder.js";
import { ProvidersView } from "../providers/providers.view.js";
import { initProviders } from "../providers/providers.js";
import { ProviderCategoriesView } from "../provider-categories/provider-categories.view.js";
import { initProviderCategories } from "../provider-categories/provider-categories.js";
import { VisitCategoriesView } from "../visit-categories/visit-categories.view.js";
import { initVisitCategories } from "../visit-categories/visit-categories.js";
import { ScreeningToolsView } from "../screening-tools/screening-tools.view.js";
import { initScreeningTools } from "../screening-tools/screening-tools.js";
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
import { ReportsView } from "../reports/reports.view.js";
import { initReports } from "../reports/reports.js";
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
import { initDemographicsForm } from "../reports/demographics-form.js";
import { DemographicsFormView } from "../reports/demographics-form.view.js";
import { initMessageListReport } from "../reports/message-list.js";
import { MessageListView } from "../reports/message-list.view.js";
function renderPlaceholderTab(title) {
    return `<div style="padding: 20px;">
        <h2>${title}</h2>
        <p>This module is currently under development or loading...</p>
    </div>`;
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

    // Open default dashboard tab
    tabManager.openTab('dashboard', 'Dashboard', () => {
        setTimeout(() => initDashboardHome(user), 0);
        return DashboardHomeView(user);
    });

    // Opens (or, when restoring saved tabs, merely registers) a dashboard
    // tab by id. `activate` controls whether it's actually rendered into
    // the shared tab-content area right now: TabManager.switchTab() swaps
    // that single container's innerHTML synchronously, so restoring
    // several saved tabs must only activate the one that ends up visible
    // -- activating each of them in turn would render, then immediately
    // clobber, every earlier tab's DOM before its deferred init() runs.
    function openDashboardTab(tabId, title, activate = true) {
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
        } else if (tabId === 'screening_tools') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initScreeningTools, 0);
                return ScreeningToolsView();
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
        } else if (tabId === 'blank_forms_core_demographics') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initDemographicsForm, 0);
                return DemographicsFormView();
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
        } else if (tabId === 'help') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initHelp, 0);
                return HelpView();
            }, activate);
        } else {
            tabManager.openTab(tabId, title, () => renderPlaceholderTab(title), activate);
        }
    }

    // Attach navigation listeners
    const navLinks = document.querySelectorAll('#navbarLinks a[data-tab]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            const title = link.textContent.trim();

            openDashboardTab(tabId, title);
        });
    });

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
}
