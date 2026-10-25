import { BloodBankView, initBloodBank } from "../modules/blood-bank/blood-bank.js";
import { DietaryView, initDietary } from "../modules/dietary/dietary.js";
import { InpatientBillingView, initInpatientBilling } from "../modules/inpatient-billing/inpatient-billing.js";
import { SplitCashieringView, initSplitCashiering } from "../modules/split-cashiering/split-cashiering.js";
import { ClaimDenialsView, initClaimDenials } from "../modules/claim-denials/claim-denials.js";
import { PatientDepositsView, initPatientDeposits } from "../modules/patient-deposits/patient-deposits.js";
import { RefundAuthorizationView, initRefundAuthorization } from "../modules/refund-authorization/refund-authorization.js";
import { ArAgingView, initArAging } from "../modules/ar-aging/ar-aging.js";
import { TariffMasterView, initTariffMaster } from "../modules/tariff-master/tariff-master.js";
import { DoctorCommissionsView, initDoctorCommissions } from "../modules/doctor-commissions/doctor-commissions.js";
import { StaffCredentialsView, initStaffCredentials } from "../modules/staff-credentials/staff-credentials.js";
import { DutyRostersView, initDutyRosters } from "../modules/duty-rosters/duty-rosters.js";
import { AttendanceView, initAttendance } from "../modules/attendance/attendance.js";
import { LoginView } from "../modules/auth/login.view.js?v=110";
import { DashboardView } from "../modules/dashboard/dashboard.view.js?v=193";
import { Dashboard } from "../modules/dashboard/dashboard.js?v=326";
import { initLogin } from "../modules/auth/auth.js?v=116";
import { AddEmployeeView } from "../modules/employees/add-employee.view.js?v=104";
import { initAddEmployee } from "../modules/employees/add-employee.js?v=105";
import { AddPatientView } from "../modules/patients/add-patient.view.js?v=104";
import { initAddPatient } from "../modules/patients/add-patient.js?v=104";
import { PrivacyPolicyView } from "../modules/privacy-policy/privacy-policy.view.js?v=4";
import { initPrivacyPolicy } from "../modules/privacy-policy/privacy-policy.js?v=5";
import { TermsConditionsView } from "../modules/terms-conditions/terms-conditions.view.js?v=3";
import { initTermsConditions } from "../modules/terms-conditions/terms-conditions.js?v=3";
import { SystemDocumentationView } from "../modules/system-documentation/system-documentation.view.js?v=20";
import { initSystemDocumentation } from "../modules/system-documentation/system-documentation.js?v=7";
import { EquipmentAssetsView } from "../modules/equipment-assets/equipment-assets.view.js";
import { initEquipmentAssets } from "../modules/equipment-assets/equipment-assets.js";
import { ClinicSchedulesView } from "../modules/clinic-schedules/clinic-schedules.view.js";
import { initClinicSchedules } from "../modules/clinic-schedules/clinic-schedules.js";
import { DepartmentOrgView } from "../modules/department-org/department-org.view.js";
import { initDepartmentOrg } from "../modules/department-org/department-org.js";
import { HipaaAuditView } from "../modules/hipaa-audit/hipaa-audit.view.js?v=4";
import { initHipaaAudit } from "../modules/hipaa-audit/hipaa-audit.js?v=5";

const app = document.getElementById("app");

const routes = {
    "/login": {
        view: LoginView,
        afterRender: initLogin
    },
    "/dashboard": {
        view: DashboardView,
        afterRender: Dashboard
    },
    "/employees/create": {
        view: AddEmployeeView,
        afterRender: initAddEmployee
    },
    "/patients/create": {
        view: AddPatientView,
        afterRender: initAddPatient
    },
    "/privacy-policy": {
        view: PrivacyPolicyView,
        afterRender: initPrivacyPolicy
    },
    "/terms-conditions": {
        view: TermsConditionsView,
        afterRender: initTermsConditions
    },
    "/terms_conditions": {
        view: TermsConditionsView,
        afterRender: initTermsConditions
    },
    "/privacy_policy": {
        view: PrivacyPolicyView,
        afterRender: initPrivacyPolicy
    },
    "/system-documentation": {
        view: SystemDocumentationView,
        afterRender: initSystemDocumentation
    },
    "/system_documentation": {
        view: SystemDocumentationView,
        afterRender: initSystemDocumentation
    },
    "/system-docs": {
        view: SystemDocumentationView,
        afterRender: initSystemDocumentation
    },
    "/docs": {
        view: SystemDocumentationView,
        afterRender: initSystemDocumentation
    },
    "/equipment-assets": {
        view: EquipmentAssetsView,
        afterRender: initEquipmentAssets
    },
    "/equipment_assets": {
        view: EquipmentAssetsView,
        afterRender: initEquipmentAssets
    },
    "/clinic-schedules": {
        view: ClinicSchedulesView,
        afterRender: initClinicSchedules
    },
    "/clinic_schedules": {
        view: ClinicSchedulesView,
        afterRender: initClinicSchedules
    },
    "/department-org": {
        view: DepartmentOrgView,
        afterRender: initDepartmentOrg
    },
    "/department_org": {
        view: DepartmentOrgView,
        afterRender: initDepartmentOrg
    },
    "/hipaa-audit": {
        view: () => HipaaAuditView({ initialTab: 'activity' }),
        afterRender: () => initHipaaAudit({ initialTab: 'activity' })
    },
    "/hipaa_audit": {
        view: () => HipaaAuditView({ initialTab: 'activity' }),
        afterRender: () => initHipaaAudit({ initialTab: 'activity' })
    },
    "/audit-diffs": {
        view: () => HipaaAuditView({ initialTab: 'diffs' }),
        afterRender: () => initHipaaAudit({ initialTab: 'diffs' })
    },
    "/audit_trail_diffs": {
        view: () => HipaaAuditView({ initialTab: 'diffs' }),
        afterRender: () => initHipaaAudit({ initialTab: 'diffs' })
    },
    "/system-logs": {
        view: () => HipaaAuditView({ initialTab: 'auth' }),
        afterRender: () => initHipaaAudit({ initialTab: 'auth' })
    },
    "/system_logs": {
        view: () => HipaaAuditView({ initialTab: 'auth' }),
        afterRender: () => initHipaaAudit({ initialTab: 'auth' })
    },
    "/blood-bank": {
        view: BloodBankView,
        afterRender: initBloodBank
    },
    "/blood_bank": {
        view: BloodBankView,
        afterRender: initBloodBank
    },
    "/dietary": {
        view: DietaryView,
        afterRender: initDietary
    },
    "/nutrition": {
        view: DietaryView,
        afterRender: initDietary
    },
    "/inpatient-billing": {
        view: InpatientBillingView,
        afterRender: initInpatientBilling
    },
    "/inpatient_billing": {
        view: InpatientBillingView,
        afterRender: initInpatientBilling
    },
    "/inpatient-folios": {
        view: InpatientBillingView,
        afterRender: initInpatientBilling
    },
    "/master-folio": {
        view: InpatientBillingView,
        afterRender: initInpatientBilling
    },
    "/split-cashiering": {
        view: SplitCashieringView,
        afterRender: initSplitCashiering
    },
    "/split_cashiering": {
        view: SplitCashieringView,
        afterRender: initSplitCashiering
    },
    "/cashier": {
        view: SplitCashieringView,
        afterRender: initSplitCashiering
    },
    "/split-tender": {
        view: SplitCashieringView,
        afterRender: initSplitCashiering
    },
    "/claim-denials": {
        view: ClaimDenialsView,
        afterRender: initClaimDenials
    },
    "/claim_denials": {
        view: ClaimDenialsView,
        afterRender: initClaimDenials
    },
    "/denial-management": {
        view: ClaimDenialsView,
        afterRender: initClaimDenials
    },
    "/appeals-workflow": {
        view: ClaimDenialsView,
        afterRender: initClaimDenials
    },
    "/patient-deposits": {
        view: PatientDepositsView,
        afterRender: initPatientDeposits
    },
    "/patient_deposits": {
        view: PatientDepositsView,
        afterRender: initPatientDeposits
    },
    "/advance-deposits": {
        view: PatientDepositsView,
        afterRender: initPatientDeposits
    },
    "/deposits-ledger": {
        view: PatientDepositsView,
        afterRender: initPatientDeposits
    },
    "/deposit-refunds": {
        view: PatientDepositsView,
        afterRender: initPatientDeposits
    },
    "/refund-authorization": {
        view: RefundAuthorizationView,
        afterRender: initRefundAuthorization
    },
    "/refund_authorization": {
        view: RefundAuthorizationView,
        afterRender: initRefundAuthorization
    },
    "/refund-requests": {
        view: RefundAuthorizationView,
        afterRender: initRefundAuthorization
    },
    "/refund_requests": {
        view: RefundAuthorizationView,
        afterRender: initRefundAuthorization
    },
    "/refund-pipeline": {
        view: RefundAuthorizationView,
        afterRender: initRefundAuthorization
    },
    "/ar-aging": {
        view: ArAgingView,
        afterRender: initArAging
    },
    "/ar_aging": {
        view: ArAgingView,
        afterRender: initArAging
    },
    "/accounts-receivable": {
        view: ArAgingView,
        afterRender: initArAging
    },
    "/ar-dashboard": {
        view: ArAgingView,
        afterRender: initArAging
    },
    "/aging-matrix": {
        view: ArAgingView,
        afterRender: initArAging
    },
    "/tariff-master": {
        view: TariffMasterView,
        afterRender: initTariffMaster
    },
    "/tariff_master": {
        view: TariffMasterView,
        afterRender: initTariffMaster
    },
    "/tariffs": {
        view: TariffMasterView,
        afterRender: initTariffMaster
    },
    "/price-book": {
        view: TariffMasterView,
        afterRender: initTariffMaster
    },
    "/service-packages": {
        view: TariffMasterView,
        afterRender: initTariffMaster
    },
    "/doctor-commissions": {
        view: DoctorCommissionsView,
        afterRender: initDoctorCommissions
    },
    "/doctor_commissions": {
        view: DoctorCommissionsView,
        afterRender: initDoctorCommissions
    },
    "/doctor-fees": {
        view: DoctorCommissionsView,
        afterRender: initDoctorCommissions
    },
    "/doctor_fees": {
        view: DoctorCommissionsView,
        afterRender: initDoctorCommissions
    },
    "/physician-payouts": {
        view: DoctorCommissionsView,
        afterRender: initDoctorCommissions
    },
    "/staff-credentials": {
        view: StaffCredentialsView,
        afterRender: initStaffCredentials
    },
    "/staff_credentials": {
        view: StaffCredentialsView,
        afterRender: initStaffCredentials
    },
    "/clinical-privileges": {
        view: StaffCredentialsView,
        afterRender: initStaffCredentials
    },
    "/clinical_privileges": {
        view: StaffCredentialsView,
        afterRender: initStaffCredentials
    },
    "/credentials-registry": {
        view: StaffCredentialsView,
        afterRender: initStaffCredentials
    },
    "/duty-rosters": {
        view: DutyRostersView,
        afterRender: initDutyRosters
    },
    "/duty_rosters": {
        view: DutyRostersView,
        afterRender: initDutyRosters
    },
    "/doctor-on-call": {
        view: DutyRostersView,
        afterRender: initDutyRosters
    },
    "/doctor_on_call": {
        view: DutyRostersView,
        afterRender: initDutyRosters
    },
    "/on-call-roster": {
        view: DutyRostersView,
        afterRender: initDutyRosters
    },
    "/physician-rosters": {
        view: DutyRostersView,
        afterRender: initDutyRosters
    },
    "/attendance": {
        view: AttendanceView,
        afterRender: initAttendance
    },
    "/time-clock": {
        view: AttendanceView,
        afterRender: initAttendance
    },
    "/time_clock": {
        view: AttendanceView,
        afterRender: initAttendance
    },
    "/staff-attendance": {
        view: AttendanceView,
        afterRender: initAttendance
    },
    "/staff_attendance": {
        view: AttendanceView,
        afterRender: initAttendance
    },
    "/dtr": {
        view: AttendanceView,
        afterRender: initAttendance
    }
};

export function router()
{
    function render()
    {
        let raw = window.location.hash.replace(/^#/, '').trim();
        if (!raw) {
            raw = '/login';
        }
        if (!raw.startsWith('/')) {
            raw = '/' + raw;
        }
        const path = raw.split('?')[0];

        const route = routes[path];

        if (!route)
        {
            app.innerHTML = `
                <div style="padding: 40px; text-align: center; font-family: sans-serif;">
                    <h1 style="color: #0f172a; margin-bottom: 12px;">404 - Page Not Found</h1>
                    <p style="color: #64748b; margin-bottom: 20px;">The requested URL <code>#${encodeURIComponent(path)}</code> was not found.</p>
                    <a href="#/dashboard" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Return to Dashboard</a>
                </div>
            `;
            return;
        }

        app.innerHTML = route.view();

        if (route.afterRender)
        {
            route.afterRender();
        }
    }

    window.addEventListener(
        "hashchange",
        render
    );

    render();
}
