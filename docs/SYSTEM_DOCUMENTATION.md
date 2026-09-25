# USIntellix Hospital Management System
## Master System Documentation & Architecture Guide

**System Version**: 2.6.0  
**Target Environment**: Enterprise Hospital, Multi-Specialty Clinic & Inpatient Healthcare Networks  
**Classification**: Enterprise Electronic Health Record (EHR) & Hospital Information System (HIS)  
**Regulatory Compliance**: HIPAA Security & Privacy Rules (45 CFR Parts 160 & 164), ONC HIT Certified Criteria  
**Last Updated**: September 2026  

---

## Table of Contents
1. [System Overview & Objectives](#1-system-overview--objectives)
2. [HIPAA Compliance & Security Safeguards](#2-hipaa-compliance--security-safeguards)
3. [Technology Stack & Architecture](#3-technology-stack--architecture)
4. [User Roles & Access Control Matrix](#4-user-roles--access-control-matrix)
5. [Core Functional Modules](#5-core-functional-modules)
   - [Patient Management & Demographics](#patient-management--demographics)
   - [Inpatient Bed Management (ADT)](#inpatient-bed-management-adt)
   - [Clinical EHR & Patient Chart](#clinical-ehr--patient-chart)
   - [Appointments & Scheduling](#appointments--scheduling)
   - [Billing, Fee Sheets & EDI Claims](#billing-fee-sheets--edi-claims)
   - [Pharmacy & Drug Inventory](#pharmacy--drug-inventory)
   - [Laboratory & Diagnostic Procedures](#laboratory--diagnostic-procedures)
   - [Patient Portal & Proxy Access](#patient-portal--proxy-access)
   - [Clinical Reporting & Quality Measures](#clinical-reporting--quality-measures)
   - [Administration & Security Governance](#administration--security-governance)
6. [Backend Architecture & API Design](#6-backend-architecture--api-design)
7. [Frontend Architecture & Tab Management](#7-frontend-architecture--tab-management)
8. [Database Architecture & Migrations](#8-database-architecture--migrations)
9. [Directory Structure](#9-directory-structure)
10. [Installation, Configuration & Deployment](#10-installation-configuration--deployment)

---

## 1. System Overview & Objectives

The **USIntellix Hospital Management System** is a unified, enterprise-grade healthcare management platform designed to automate clinical, administrative, and financial operations in modern hospitals and ambulatory clinics.

### Primary Capabilities
- **Comprehensive Patient Care**: From admission to discharge (ADT), longitudinal health records, encounter documentation, and clinical decision support.
- **Interoperability & Standards**: Support for standard medical coding systems (ICD-10, CPT, HCPCS, SNOMED, LOINC, CVX, RxNorm), electronic laboratory interfaces, and EDI X12 transaction standards (837P claims, 835 remittances).
- **Patient Engagement**: Integrated self-service Patient Portal with family/caregiver proxy access, appointment requests, secure messaging, and clinical record viewing.
- **Regulatory Compliance**: Built ground-up to satisfy HIPAA Security and Privacy requirements, offering cryptographic audit logging, account brute-force protection, 90-day password rotation, and emergency clinical overrides.

---

## 2. HIPAA Compliance & Security Safeguards

> [!IMPORTANT]
> A dedicated, regulatory-grade specification of all HIPAA rules implemented in USIntellix is maintained in [docs/HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md).

The system enforces strict compliance with 45 CFR Parts 160 & 164 across all functional areas:

### Summary of HIPAA Controls Implemented

| HIPAA Rule & Citation | Feature Implemented | Technical Mechanism |
|---|---|---|
| **§ 164.312(a)(1)** | Unique User Identification | Unique account IDs, bcrypt password hashing, forced first-login reset, and SMS/Email 2FA OTP. |
| **§ 164.312(a)(2)(i)** | Account Lockout & Brute-Force Defense | Locks account after 5 consecutive failed logins within 15 minutes; 30-minute cooldown or admin unlock. |
| **§ 164.312(a)(2)(ii)** | Emergency "Break-Glass" Access | Clinicians can access emergency non-assigned charts with required justification and immediate audit logging. |
| **§ 164.312(a)(2)(iii)** | Automatic Inactivity Logoff | 15-minute document-wide inactivity tracker with 60-second visual warning modal and session purge. |
| **§ 164.312(b)** | Cryptographic Audit Controls | Append-only `hipaa_audit_logs` capturing all authentication, chart access, exports, and modifications. |
| **§ 164.312(c)(1)** | Tamper-Evident Hash Chaining | Sequential SHA-256 HMAC integrity signatures linking each audit record to detect any database manipulation. |
| **§ 164.316(b)(2)(i)** | 6-Year Retention & Compliance Export | Immutable 6-year retention locked by MariaDB triggers (`trg_hipaa_audit_logs_retention_guard` & `trg_hipaa_audit_logs_immutability_guard`); one-click CSV and print-ready PDF compliance reports. |
| **§ 164.312(a)(2)(iv)** | Field-Level Database Encryption at Rest | NIST SP 800-38D AES-256-GCM authenticated cipher encrypting SSN, national IDs, credit cards, SOAP clinical notes, and segregated psychiatric notes (`enc:v1:` envelopes). |
| **§ 164.312(e)(1)** | Transmission Security & Anti-Caching | Global HTTP headers: `Cache-Control: no-store`, `Pragma: no-cache`, `X-Frame-Options: SAMEORIGIN`, `nosniff`. |
| **§ 164.308(a)(5)(ii)(D)** | Password Expiration & History | 90-day mandatory expiration, previous 5 passwords restriction, 7-day advance notice banner, complexity rules. |
| **§ 164.308(a)(4)** | Role-Based Access Control (RBAC) | Granular roles (Admin, Physician, Nurse, Receptionist, Biller, Patient) and dynamic ACL permission groups. |
| **§ 164.502(b) & § 164.514(d)** | Minimum Necessary PHI Access Control | Server-side restriction of clinical charts/labs for non-clinical staff, doctor patient-assignment boundaries, dashboard summary redaction, and Break-Glass modal. |
| **§ 164.528** | Accounting of Disclosures Log | Dedicated submodule (`Miscellaneous &rarr; Accounting of Disclosures`) tracking all non-TPO PHI releases (subpoenas, public health, law enforcement, HIE); captures full statutory fields (§ 164.528(b)(2)), 6-year retention lookback, printable formal patient accounting statement, regulatory CSV export, and chained audit trails. |
| **§ 164.520** | Patient Consent & Notice of Privacy Practices (NPP) Signature Capture | Mandatory 45 CFR § 164.520 patient acknowledgment: first-portal-login electronic signature gating, in-clinic check-in capture console, versioning (`2026-09`), and immutable `npp_consent_log` audit retention. |
| **§§ 164.400 – 164.414** | Breach Notification & 4-Factor Risk Assessment | Statutory 4-factor risk assessment calculator (§ 164.402), 60-day notification countdown clocks, formal individual notification letters (§ 164.404(c)), HHS OCR JSON portal filing package (§ 164.408), and chained audit logging. |
| **§ 164.502(e) / § 164.504(e)** | Business Associate Agreement (BAA) Tracking & Vendor Governance | Centralized vendor registry, dynamic 60-day renewal alerts, unexecuted BAA gap warnings, downstream subcontractor PHI tracking (§ 164.504(e)(2)(ii)(D)), HHS OCR Question #1 compliance dossier, and RFC 4180 CSV export. |
| **§ 164.522(a)(1)(vi)** | HITECH Out-of-Pocket Insurance Restriction | Encounter-level self-pay restriction card, automated `claim_suppressed = 1`, server-side EDI X12 dispatch block, Fee Sheet and Billing Manager worklist indicators, dedicated `hipaa_hitech_restrictions` registry, and RFC 4180 CSV export. |
| **§ 164.522(b)** | Confidential Communications Preferences Enforcement | Patient right to alternative communications; binding voicemail and SMS toggles, alternative address/phone/email, Patient Chart and Context Bar alert banners, `hipaa_confidential_communications_log` audit history, and RFC 4180 CSV export. |
| **§ 164.524** | Patient Right of Access 30-Day DRS Management | Centralized administrative access pipeline, automated 30-day statutory countdown timer, single 30-day extension (§ 164.524(b)(2)(ii)) with formal written notice generator, complete Designated Record Set (DRS) bundles (clinical notes, vitals, labs, medications, allergies, billing ledger) in PDF/JSON formats, fee limit rules (§ 164.524(c)(4)), and RFC 4180 CSV export. |
| **§ 164.526** | Formal PHI Amendment 60-Day Workflow & Registry | Administrative 60-day action pipeline, single 30-day extension enforcement (§ 164.526(b)(2)(ii)), 4 statutory denial grounds (§ 164.526(a)(2)), written denial notice generator, permanent Statement of Disagreement & Rebuttal linking, DRS bundle auto-dissemination (§ 164.526(d)(4)), and RFC 4180 CSV export. |
| **§ 164.308(a)(7)** | Automated Encrypted Backup & Disaster Recovery Console | Authenticated AES-256-GCM backup encryption, SHA-256 integrity checksum verification, SLA monitoring, disaster recovery restoration drill logs, and RFC 4180 CSV exports. |
| **§ 164.308(a)(1) & (5)** | Workforce Training Tracking & Disciplinary Sanctions Log | Initial 30-day onboarding deadline, 365-day refresher countdowns, certificate generator, 5-tier disciplinary sanctions log with automatic account lockout, RFC 4180 CSV exports, and chained audit logs. |
| **Secrets Isolation** | Zero Frontend Secrets Exposure | All database credentials, mail passwords, and API keys isolated to backend `.env`. |

### HIPAA Audit Readiness & Remaining Statutory Parameters

To achieve 100% compliance across an official **HHS Office for Civil Rights (OCR)** audit or third-party assessment (SOC 2 Type II + HIPAA, HITRUST CSF), the remaining statutory parameters are planned under the following phased roadmap:

| Rule & Section | Safeguard / Missing Parameter | Statutory Mandate & Impact | Priority | Status |
|:---|:---|:---|:---:|:---:|
| **§§ 164.400 – 164.414** | **Breach Notification & 4-Factor Risk Assessment** | Statutory presumption of breach (§ 164.402); mandatory 4-factor risk assessment formula; 60-day patient notification countdown; HHS OCR portal reporting (<500 annual log vs. ≥500 immediate reporting). | 🔴 Critical | **Implemented** |
| **§ 164.502(e) / § 164.504(e)** | **Business Associate Agreement (BAA) Registry** | Prohibition on sharing ePHI without signed BAA; vendor inventory tracking, review/expiration dates, downstream subcontractor tracking, and automated renewal alerts. | 🔴 Critical | **Implemented** |
| **§ 164.522(a)(1)(vi)** | **HITECH Out-of-Pocket Insurance Restriction** | Mandatory patient right to withhold disclosure to health plan for care paid in full out-of-pocket; automated claim suppression (<code>claim_suppressed = 1</code>), server-side EDI X12 block, Fee Sheet and Billing Manager worklist indicators. | 🟠 High | **Implemented** |
| **§ 164.522(b)** | **Confidential Communications Preferences** | Patient right to alternative contact methods/locations; voicemail restrictions; chart banner warning badges, context bar & finder table badges, audit ledger, and CSV export. | 🟠 High | **Implemented** |
| **§ 164.524** | **Right of Access 30-Day DRS Fulfillment Pipeline** | Designated Record Set request tracker, 30-day statutory countdown timer, one-click comprehensive PDF/JSON export bundle, single 30-day extension notice generator, and strict fee limit validation. | 🟠 High | **Implemented** |
| **§ 164.526** | **Statutory PHI Amendment 60-Day Workflow** | 60-day action clock, single 30-day extension enforcement (§ 164.526(b)(2)(ii)), written denial notices citing 4 statutory grounds, Statement of Disagreement linking, and DRS bundle auto-dissemination. | 🟡 Medium | **Implemented** |
| **§ 164.308(a)(7)** | **Backup & Contingency Verification Console** | In-app daily encrypted backup status, authenticated AES-256-GCM encryption, SHA-256 integrity verification, and periodic restoration drill logs. | 🟡 Medium | **Implemented** |
| **§ 164.308(a)(1) & (5)** | **Workforce Training & Sanctions Log** | Annual HIPAA training certification tracking in employee profiles, 30-day onboarding timers, and confidential 5-tier disciplinary sanctions log with immediate termination account lock. | 🟡 Medium | **Implemented** |
| **§ 164.514(b)** | **Safe Harbor 18-Identifier De-Identification** | Automated removal/masking of all 18 HIPAA identifiers for clinical research and statistical export datasets. | 🟡 Medium | **Roadmap (Tier 3)** |
| **§ 164.308(a)(2)** | **HIPAA Privacy & Security Officer Designation** | Dedicated system configuration of official Privacy and Security Officers with dynamic notice auto-fill. | 🟢 Low | **Roadmap (Tier 3)** |

> [!NOTE]
> Full technical specifications, statutory citations, and implementation architecture for each parameter are detailed in [docs/HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md#8-hipaa-audit-readiness-gap-analysis--statutory-roadmap).

---

## 3. Technology Stack & Architecture

```
+-------------------------------------------------------------------------+
|                              CLIENT TIER                                |
|   Vanilla JavaScript (ES Modules)  *  Responsive CSS  *  HTML5 SPA      |
|   TabManager (Multi-Tab Workspace) *  Inactivity Guard *  Router        |
+------------------------------------+------------------------------------+
                                     |  JSON / HTTPS
                                     v
+-------------------------------------------------------------------------+
|                            APPLICATION TIER                             |
|   PHP 8.x Modular MVC  *  Custom Router  *  Middleware (CORS, Auth)     |
|   Controllers  *  Domain Services  *  ActiveRecord / QueryBuilder       |
|   AuditLogger (HMAC-SHA256) *  PasswordSecurity *  Session Guard        |
+------------------------------------+------------------------------------+
                                     |  PDO
                                     v
+-------------------------------------------------------------------------+
|                                DATA TIER                                |
|   MySQL 5.7+ / MariaDB 10.3+  *  InnoDB Storage Engine (ACID)           |
|   Foreign Key Relational Constraints  *  Migration-Driven Schemas       |
+-------------------------------------------------------------------------+
```

### Backend Components
- **Language**: PHP 8.0+ (OOP, Strict Typing).
- **Architecture**: Modular Model-View-Controller (MVC) with dedicated domain directories under `backend/app/Modules/<ModuleName>/`.
- **Router**: Lightweight regular-expression URL matcher (`App\Core\Router`) supporting HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`), parameter binding (`:id`), and route middleware pipelines.
- **Database Layer**: PDO wrapper (`App\Core\Database`) with fluent `App\Core\QueryBuilder` and base `App\Core\Model`.
- **Security Services**: `App\Core\AuditLogger`, `App\Core\PasswordSecurity`, `App\Core\Session`, and `App\Core\Cors`.

### Frontend Components
- **Framework**: Modern Vanilla JavaScript (Native ES Modules, zero external heavy runtime dependencies like React/Vue).
- **Application Shell**: Single Page Application (SPA) driven by hash-based routing (`#/login`, `#/dashboard`, `#/privacy-policy`).
- **Tab Management System (`TabManager`)**: Emulates a desktop workstation experience inside the browser. Clinicians can maintain multiple open patient charts, calendars, fee sheets, and reports concurrently without losing unsaved state.
- **Styling**: Modular CSS with native CSS custom properties for theming (Light and Dark mode support).

---

## 4. User Roles & Access Control Matrix

USIntellix implements strict Role-Based Access Control (RBAC):

| Functional Area | Admin | Physician | Nurse | Receptionist | Biller | Patient |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **User & Employee Management** | **Full** | None | None | None | None | None |
| **System Settings & Code Sets** | **Full** | View | None | None | None | None |
| **HIPAA Audit Logs & Integrity** | **Full** | None | None | None | None | None |
| **Patient Registration & Finder** | Full | Full | Full | **Full** | View | None |
| **Inpatient Bed Management (ADT)** | Full | Full | **Full** | View (Beds) | None | None |
| **Patient Demographics & Insurance** | Full | Full | Full | **Full** | Full | Self Only |
| **Clinical Encounters & SOAP Notes**| Full | **Full** | Limited | None | None | Self (View) |
| **Vital Signs & Triage** | Full | Full | **Full** | None | None | Self (View) |
| **Prescriptions & Orders** | Full | **Full** | View/Administer | None | None | Self (View) |
| **Emergency Break-Glass Override** | Full | **Full** | View Only | None | None | None |
| **Fee Sheets & Superbills** | Full | Full | None | None | **Full** | None |
| **EDI Claims (837) & Remittances** | Full | None | None | None | **Full** | None |
| **Drug Inventory & Warehouses** | Full | View | View | None | None | None |
| **Security Incidents & Breach Assessment** | **Full** | Report Only | Report Only | None | None | None |
| **BAA Vendor Registry & Governance** | **Full** | None | None | None | None | None |
| **Accounting of Disclosures** | **Full** | View | View | View/Record | View/Record | Self (Request) |
| **Patient Portal (Self-Service)** | None | None | None | None | None | **Full (Self)**|

---

## 5. Core Functional Modules

### Patient Management & Demographics
- **New Patient Registration**: Captures complete demographic data, contact numbers, emergency contacts, employer details, and multiple insurance coverages (Primary, Secondary, Tertiary).
- **Patient Finder**: Fast asynchronous search filtering by MRN, First Name, Last Name, Date of Birth, Phone, or Social Security Number.
- **Patient Flow Board**: Real-time visual tracking of patient progress through clinic stages (`Arrived`, `Waiting Room`, `Triage`, `Exam Room`, `Discharged`).
- **Patient Merge & Duplicate Prevention**: Tools to detect accidental duplicate records, compare demographic fields side-by-side, and merge clinical history into a single canonical MRN.

### Inpatient Bed Management (ADT)
- **Admission, Discharge, Transfer**: Tracks inpatient hospitalizations, admission types (Elective, Urgent, Emergency, Trauma), admitting diagnoses, and attending physicians.
- **Ward, Room & Bed Management**: Interactive floorplan and list view of hospital rooms and beds. Displays real-time occupancy status (`Available`, `Occupied`, `Cleaning`, `Maintenance`).
- **Bed Transfers**: Moves patients between wards (e.g., Emergency &rarr; ICU &rarr; Stepdown) with complete audit tracking and bed history.

### Clinical EHR & Patient Chart
- **Widget-Based Chart Dashboard**: Configurable clinical widgets summarizing Allergies, Active Problem List, Current Medications, Immunizations, Vitals Trend, and Past Encounters.
- **Clinical Encounters**: Comprehensive encounter documentation supporting Chief Complaint, Review of Systems (ROS), Physical Examination, SOAP Notes, Assessment, and Care Plans.
- **Patient History Subsystem**: Detailed 5-tab history module:
  - *General*: 20 risk factors and 15 physical examination categories.
  - *Family History*: Father, mother, siblings, spouse, offspring with diagnosis picker.
  - *Relatives*: 9-condition familial disease checklist.
  - *Lifestyle*: Tobacco pack-years, alcohol, recreational drugs, sleep patterns, exercise, and counseling.
  - *Other*: Additional clinical background.
- **Clinical Reminders & Alerts**: Automated rules warning clinicians of overdue screenings (mammograms, colonoscopies, diabetic foot exams) based on age, gender, and clinical guidelines.

### Appointments & Scheduling
- **Multi-View Calendar**: Interactive scheduling views (Day, Week, Month, Provider Multi-Column).
- **Status Workflows**: Booked &rarr; Confirmed &rarr; Checked In &rarr; In Progress &rarr; Completed &rarr; No Show / Cancelled.
- **Recalls & Recurring Follow-ups**: Automated recall lists for preventative visits and chronic disease management.

### Billing, Fee Sheets & EDI Claims
- **Fee Sheet & Superbills**: Link CPT procedure codes, ICD-10 diagnosis codes, HCPCS modifiers, and copay amounts directly to patient encounters.
- **Billing Manager**: Queue, validate, and batch claims for submission.
- **EDI X12 Engine**:
  - *837P Professional Claims*: Electronic generation of standard insurance claim batches.
  - *835 Remittance Advice*: Automatic posting and reconciliation of insurance EOBs.
  - *EDI History*: Historical archive of outbound claims and inbound clearinghouse responses.
- **Checkout & Point-of-Sale**: Real-time patient copay, coinsurance, and cash collection at discharge.

### Pharmacy & Drug Inventory
- **Warehouse Management**: Track pharmaceutical stock across multiple locations (Central Pharmacy, Emergency Crash Carts, Floor Stock).
- **Lot & Expiration Tracking**: Alerts clinicians to expiring drugs, recalled lots, and stock replenishment thresholds.
- **Destroyed Drugs Log**: Compliant disposal recording for controlled substances requiring dual-witness signatures.

### Laboratory & Diagnostic Procedures
- **Procedure Orders**: Electronically generate lab and diagnostic imaging requisitions.
- **Compendium Management**: Load and maintain laboratory test compendiums (e.g., Quest, LabCorp).
- **Trend Analysis**: Graph longitudinal lab results (e.g., HbA1c, Lipid panels) over time.

### Patient Portal & Proxy Access
- **Self-Service Portal**: Mobile-responsive patient dashboard for viewing lab results, vitals, visit summaries, educational resources, and upcoming appointments.
- **Secure Messaging**: Encrypted communication between patients and clinical care teams.
- **Authorized Proxy Access**: Allows parents, legal guardians, or adult children to toggle between their own chart and care-dependent patient charts with authorized consent.

### Clinical Reporting & Quality Measures
- **Automated Measure Calculations (AMC)**: Core electronic health record objective metrics for meaningful clinical quality reporting.
- **Clinical Quality Measures (CQM)**: Measure calculation engines for chronic disease interventions.
- **Registry Exports**: Automated exports for syndromic surveillance and state immunization registries.

### Administration & Security Governance
- **Employee & Role Directory**: User credential provisioning, status locking, department assignment.
- **ACL Permissions**: Fine-grained capability toggles per functional group.
- **HIPAA Audit Log Console & Cryptographic Integrity (§ 164.312(b) & (c)(1))**: Append-only event stream with sequential SHA-256 HMAC hash chaining and real-time mathematical integrity verification to detect unauthorized database tampering.
- **Audit Trail 6-Year Retention & Compliance Export (§ 164.316(b)(2)(i))**:
  - *Database-Level Retention Triggers*: MariaDB engine triggers (`trg_hipaa_audit_logs_retention_guard` and `trg_hipaa_audit_logs_immutability_guard`) prevent deletion of records within 6 years of creation and block all record updates.
  - *Retention Policy Inspector*: Real-time policy guard (`AuditRetentionGuard`) reporting total protected records, days active, and 0 purge-eligible records.
  - *One-Click OCR Compliance Export*: Downloads formal RFC 4180 CSV with federal compliance metadata headers and generates print-ready PDF reports with hospital letterhead, cryptographic seals, and auditor certification blocks.
- **Field-Level Database Encryption at Rest (§ 164.312(a)(2)(iv) & § 164.501)**:
  - *NIST SP 800-38D AES-256-GCM AEAD Engine*: Cryptographically secures sensitive columns using a 256-bit symmetric key (`DB_ENCRYPTION_KEY`), 96-bit randomized IV per write, and 128-bit authentication tag to prevent tampering.
  - *Transparent ORM Integration*: Base model `QueryBuilder` auto-encrypts on save and auto-decrypts on read for `Patient` (`ssn`, `national_id`), `PatientLedgerPayment` (`card_number`, `card_expiry`, `card_cvv`), `EncounterSoapNote`, and `Facility`.
  - *Psychotherapy Notes Segregation*: Dedicated `patient_psychiatric_notes` table segregated under 45 CFR § 164.501, accessible exclusively to assigned clinicians and break-glass emergencies.
- **Patient Consent & Notice of Privacy Practices (NPP) Signature Capture (§ 164.520)**:
  - *First Portal Login Interception*: Patients with unacknowledged NPP are prevented from navigating to the portal dashboard until electronically acknowledging the Privacy Policy and Terms of Service with a full legal name signature.
  - *In-Clinic Reception Check-In Integration*: Staff on the Patient Flow board receive live NPP acknowledgment alerts upon selecting an appointment, with an inline capture console supporting electronic/verbal or paper signature recording.
  - *Immutable Consent Ledger*: Every signature event is persisted to `npp_consent_log` with client IP, timestamp, signature method, version string (`2026-09`), and capturing staff identity, coupled with sequential HMAC-chained HIPAA audit log events (`NPP_ACKNOWLEDGED`, `NPP_ACKNOWLEDGED_IN_CLINIC`).
- **Accounting of Disclosures Log (§ 164.528)**:
  - *Dedicated Submodule*: Accessible via `Miscellaneous &rarr; Accounting of Disclosures` (`data-tab="misc_disclosures"`). Features real-time metric cards (Total Disclosures, Court Orders & Subpoenas, Public Health, Law Enforcement, HIE feeds, 6-Year Window) and quick presets (Last 6 Years, Last 1 Year, Last 90 Days, All Time).
  - *Statutory Disclosures Ledger*: Tracks all required statutory fields under 45 CFR § 164.528(b)(2) including date, recipient entity/person and address, statutory legal basis (§ 164.512 categories), statement of purpose, specific records disclosed, requesting official, transmission medium, and docket/reference numbers.
  - *Patient Chart Integration*: Interactive widget in the Patient Dashboard with colored legal basis badges and modal for reviewing or recording disclosures directly within the clinical chart.
  - *Formal Patient Accounting Statement Generator*: Generates print-ready legal accounting statements fulfilling 45 CFR § 164.528(c)(1) within seconds, complete with facility letterhead, patient demographics, statutory disclosure table, TPO exemption disclosure notices, and Privacy Officer certification signature blocks.
  - *Regulatory Compliance CSV Export*: Streams RFC 4180 CSV exports with compliance metadata headers directly to compliance officers and OCR auditors.
  - *Cryptographic Audit Logging*: All disclosure creation, updates, deletions, and statement generation events are permanently committed to `hipaa_audit_logs` under SHA-256 HMAC hash chaining.
- **HIPAA Breach Notification Rule & Security Incident 4-Factor Risk Assessment (§§ 164.400 – 164.414 & § 164.308(a)(6))**:
  - *Dedicated Submodule*: Accessible via `Administration &rarr; System &rarr; Security Incidents &amp; Breach Assessment` or `Miscellaneous &rarr; Security Incidents &amp; Breach Assessment` (`data-tab="security_incidents"`).
  - *Master Incident Ledger & KPIs*: Real-time tracking of Total Incidents, Active Investigations, Reportable Breaches, 60-Day Deadlines Impending, Overdue Breaches, and Total Affected Individuals.
  - *Statutory 4-Factor Risk Assessment Engine (§ 164.402)*: Rebuts the federal presumption of breach by systematically evaluating and scoring (1.0 to 5.0) Factor 1 (Nature & extent of PHI), Factor 2 (Unauthorized recipient), Factor 3 (Actual viewing/acquisition), and Factor 4 (Extent of mitigation), generating automated legal determinations (Low Risk Non-Breach vs. Reportable Breach).
  - *Statutory 60-Day Notification Countdown (§ 164.404)*: Tracks days remaining against the mandatory 60-calendar-day deadline with color-coded warning pills, alerting compliance officers 15 days prior and immediately upon expiration.
  - *Formal Patient Breach Notification Letter Generator (§ 164.404(c))*: Fulfills all 5 statutory elements (what happened, what information was involved, what the hospital is doing, what the individual can do, contact information) with print-ready letterhead.
  - *HHS OCR Breach Portal JSON Filing Package (§ 164.408)*: Exports standardized filings compliant with HHS.gov OCR Breach Portal specifications (<500 annual log vs. ≥500 immediate notification).
  - *Regulatory CSV Export & Chained Audit Trails*: Streams RFC 4180 CSV exports and commits all actions to `hipaa_audit_logs` under SHA-256 HMAC chaining.
- **Business Associate Agreement (BAA) Tracking & Vendor Governance (§ 164.502(e) & § 164.504(e))**:
  - *Dedicated Submodule*: Accessible via `Administration &rarr; System &rarr; BAA Vendor Registry` or `Miscellaneous &rarr; BAA Vendor Registry` (`data-tab="business_associates"`).
  - *Centralized Vendor Directory & KPIs*: Live inventory tracking of vendors handling ePHI (cloud hosting, SMS/email relays, clearinghouses, labs, AI/transcription, IT MSPs), active contracts, upcoming expirations (≤60 days), expired contracts, and unexecuted BAA audit gaps.
  - *Dynamic Compliance Status Engine*: Evaluates execution dates and expiration dates in real time, setting status to `active`, `expiring_soon`, `expired`, or `missing_baa`.
  - *High-Risk Warning Banner*: Immediate administrative alert triggered when any active vendor handling PHI lacks an active BAA or has an expired contract.
  - *Subcontractor PHI Access Tracking (§ 164.504(e)(2)(ii)(D))*: Audits downstream subcontractor data transmission and contractual breach reporting SLAs (e.g., 24h, 48h, 72h).
  - *HHS OCR Audit Protocol Question #1 Compliance Dossier*: Instant compilation and print-ready rendering satisfying OCR vendor audit inquiries.
  - *RFC 4180 CSV Streaming & Audit Trails*: Exports compliant CSV records and logs all actions into `hipaa_audit_logs` under `CATEGORY_BAA` with HMAC-SHA-256 tamper-evident chaining.
- **HITECH Mandatory Out-of-Pocket Insurance Restriction (45 CFR § 164.522(a)(1)(vi) & HITECH § 13405(a))**:
  - *Statutory Right*: Patients have an unconditional right to mandate that providers not disclose an encounter to their health plan if the service is paid in full out-of-pocket.
  - *Automated Claim Suppression*: Flagging `hitech_restriction_requested = 1` automatically sets `claim_suppressed = 1`. In `EncounterService::setX12Status()`, any attempt to set the encounter's status to `sent` or `accepted` is strictly blocked with HTTP 422, throwing a legal prohibition error and writing a high-severity audit log `ACTION_HITECH_CLAIM_BLOCKED`.
  - *User Interface Controls*:
    - *Encounter Form Modal*: Dedicated amber toggle card recording restriction request, paid-in-full status, payment reference, and notes.
    - *Fee Sheet / Superbill*: Prominent top alert banner (`#pdFeeSheetHitechBanner`) alerting clinicians and billing staff that the visit is suppressed from insurance billing.
    - *Billing Manager Worklist*: Displays `🔒 HITECH Restricted` chip, disables EDI `sent`/`accepted` status actions, and provides a `hitech_restriction` criteria builder filter.
  - *Statutory Registry Table & OCR CSV Export*: Synchronizes all restrictions into `hipaa_hitech_restrictions` with foreign keys to encounters and patients. Streams standardized RFC 4180 CSV exports for HHS OCR audit inspection.
  - *Tamper-Evident Chained Audit Logging*: Sequential HMAC-SHA-256 logs committed under `CATEGORY_HITECH` (`HITECH_RESTRICTION_APPLIED`, `HITECH_RESTRICTION_REMOVED`, `HITECH_CLAIM_SUPPRESSED`, `HITECH_CLAIM_DISPATCH_BLOCKED`, `EXPORT_HITECH_REGISTRY_CSV`).
- **Confidential Communications Preference Enforcement (45 CFR § 164.522(b))**:
  - *Statutory Right*: Patients have an unconditional right to mandate that providers communicate PHI through alternative means or at alternative locations (e.g., cell phone only, no voicemail, alternative mailing address).
  - *Database & Schema Architecture (Migration 205)*: 10 structured fields added to `patients` (`allow_voicemail`, `preferred_contact_method`, alternative address/phone/email, notes, `has_confidential_restrictions`). Full historical revisions recorded in `hipaa_confidential_communications_log`.
  - *Multi-Surface Visual Warnings*:
    - *Patient Chart Topbar Banner (`#pdConfidentialCommBanner`)*: Displays an impassable red alert banner with explicit channel prohibitions and custom instructions before placing calls or sending mail.
    - *Patient Context Bar & Finder Table Badges*: Persistent `🔒 RESTRICTED COMMS` and `🔒 CC` table badges alert staff across all navigation tabs.
    - *Demographic Summary (Choices Tab)*: Complete breakdown of preferences, alternative channels, and staff notes.
  - *Regulatory CSV Export & Audit Logging*: RFC 4180 CSV export endpoint (`/api/patients/confidential-registry/export`) for OCR audit inspection, with tamper-evident HMAC-SHA-256 logs under `CATEGORY_COMMUNICATIONS`.
- **Patient Right of Access 30-Day Designated Record Set Pipeline (45 CFR § 164.524 & 21st Century Cures Act § 4004)**:
  - *Statutory Right*: Patients or their personal representatives have a federal right to inspect and obtain a complete copy of their Designated Record Set (DRS) within 30 calendar days (with at most one permissible 30-day extension upon formal written notice).
  - *Centralized Administrative Pipeline*: Accessible under `Administration &rarr; System &rarr; Right of Access (DRS)` or `Miscellaneous &rarr; Right of Access (DRS)` (`data-tab="drs_requests"`), featuring real-time KPI metrics (Total Requests, Active Pipeline, Impending &le;7d, Overdue, Extensions, Fulfilled) and request number tracking (`DRS-YYYY-XXXX`).
  - *Automated 30-Day Statutory Countdown*: Computes statutory deadlines and days remaining, rendering color-coded warning pills for impending (&le;7 days) and overdue requests.
  - *Single 30-Day Statutory Extension (§ 164.524(b)(2)(ii))*: Strict server-side enforcement allowing at most one 30-day extension per request; automatically generates official written extension notices citing delay reasons, new completion date, and Privacy Officer signature block.
  - *Complete DRS Export Bundle Generation (§ 164.501)*: One-click collation of demographics, clinical encounters, decrypted SOAP notes, vitals, problem list, allergies, medications, lab results, and financial ledger (`PatientLedgerService`) into printable electronic PDF bundles and structured machine-readable JSON packages.
  - *Statutory Fee Rules Engine (§ 164.524(c)(4))*: Strictly blocks search/retrieval fees, enforces $0.00 for portal downloads, and caps portable electronic media at the OCR $6.50 safe harbor.
  - *Patient Chart Integration*: Direct "Records Request" action on patient charts opens the DRS Pipeline tab and pre-selects the patient for rapid intake.
  - *Compliance Registry & Chained Audit Logging*: Dedicated database table `hipaa_drs_access_requests`, RFC 4180 CSV compliance registry export (`/api/drs-requests/registry/export`), and HMAC-SHA-256 cryptographically chained audit logging in `hipaa_audit_logs` under `CATEGORY_RIGHT_OF_ACCESS`.
- **Formal Statutory PHI Amendment Workflow (45 CFR § 164.526 & § 164.501)**:
  - *Statutory Right*: Patients have an enforceable federal right to request amendments to their Protected Health Information in a Designated Record Set.
  - *Centralized Administrative Pipeline*: Accessible under `Administration &rarr; System &rarr; PHI Amendments (§ 164.526)` or `Miscellaneous &rarr; PHI Amendments (§ 164.526)` (`data-tab="amendments"`), featuring real-time KPI metrics (Total Requests, Active Pending, Impending &le;10d, Overdue, Extensions, Accepted, Denied, Disagreements Filed) and amendment tracking (`AMD-YYYY-XXXX`).
  - *Automated 60-Day Statutory Countdown*: Computes statutory deadlines and days remaining, rendering color-coded warning pills for impending (&le;10 days) and overdue requests.
  - *Single 30-Day Statutory Extension (§ 164.526(b)(2)(ii))*: Strict server-side enforcement allowing at most one 30-day extension per request; automatically generates official written extension notices citing statutory delay reasons, new decision date, and Privacy Officer signature block.
  - *Exclusive 4 Statutory Denial Grounds & Written Notice Generator (§ 164.526(a)(2) & § 164.526(d)(1))*: Programmatically restricts denials exclusively to the 4 legally enumerated grounds (not created by entity, not part of DRS, exempt from access, accurate and complete); auto-generates formal statutory denial letters with plain-language rationale, disagreement rights, and OCR complaint instructions.
  - *Permanent EHR Linkage & Future Disclosure Bundling (§ 164.526(d)(2)-(4))*: Permanently links patient Statements of Disagreement and provider Statements of Rebuttal to disputed clinical records in the EHR; automatically bundles disagreement statements into subsequent Designated Record Set export bundles (PDF/JSON).
  - *Patient Chart Integration*: Dedicated "Statutory Pipeline (§ 164.526)" button within patient chart amendments modal enables instant navigation from clinical charts into the pipeline.
  - *Compliance Registry & Chained Audit Logging*: Upgraded database schema (`amendments`), RFC 4180 CSV compliance registry export (`/api/amendments/registry/export`), and HMAC-SHA-256 cryptographically chained audit logging in `hipaa_audit_logs` under `CATEGORY_AMENDMENTS`.
- **Automated Encrypted Backup & Disaster Recovery Verification Console (45 CFR § 164.308(a)(7))**:
  - *Statutory Standard*: HIPAA Contingency Plan mandates a formal data backup plan (§ 164.308(a)(7)(ii)(A)), disaster recovery plan (§ 164.308(a)(7)(ii)(B)), emergency mode operations (§ 164.308(a)(7)(ii)(C)), and periodic testing & revision procedures (§ 164.308(a)(7)(ii)(D)).
  - *Centralized Verification Console*: Accessible under `Administration &rarr; System &rarr; Backup &amp; Disaster Recovery (§ 164.308(a)(7))` (`data-tab="backup_recovery"`), displaying real-time KPI metrics (Last Backup Timestamp, Relative Age, AES-256 Encryption Status, Last SHA-256 Checksum, Backup SLA Health, DR Drill Success Rate, and Average RTO).
  - *NIST SP 800-38D AES-256-GCM Envelope Encryption*: Database archives are GZIP compressed and authenticated via 256-bit AES Galois/Counter Mode with 96-bit initialization vectors and 128-bit authentication tags.
  - *Cryptographic Checksum Verification Engine*: Computes and verifies SHA-256 hashes on storage disk, verifies GZIP stream headers, issues verification certificates, and flags tampering.
  - *Disaster Recovery Drill Registry*: Formally records simulated restoration drills (sandbox restore, tabletop simulation, hot-site failover) with operator identity, target environment, Recovery Time Objective (RTO target &le; 240m), Recovery Point Objective (RPO target &le; 24h), and restoration outcomes.
  - *Compliance Registries & Chained Audit Logging*: Database schema `hipaa_backup_logs` and `hipaa_disaster_recovery_drills`, RFC 4180 CSV compliance registry exports (`/api/backup/export/backups` and `/api/backup/export/drills`), and sequential HMAC-SHA-256 cryptographically chained audit logging in `hipaa_audit_logs` under `CATEGORY_BACKUP`.
- **Workforce HIPAA Training Tracking & Disciplinary Sanctions Log (45 CFR § 164.308(a)(1)(ii)(C) & § 164.308(a)(5))**:
  - *Statutory Standards*: Mandatory security awareness training for all workforce members within 30 days of hire and annual refresher intervals (§ 164.308(a)(5)), coupled with mandatory documented disciplinary sanctions against workforce members violating security or privacy policies (§ 164.308(a)(1)(ii)(C)).
  - *Centralized Governance Console*: Accessible under `Administration &rarr; System &rarr; Workforce HIPAA Governance (§ 164.308)` (`data-tab="workforce_governance"`), featuring real-time KPI metrics (Total Workforce, Compliant Staff, Approaching Due &le;30d, Overdue Staff, Active Sanctions, Enforced Terminations).
  - *Dual-Tab Governance Ledgers*:
    - *Training Ledger*: Records training events (`CERT-YYYY-XXXX`), tracks curricula, scores (&ge;80% passing threshold), certification dates, and auto-generates printable Training Completion Certificates. Automatically synchronizes employee profile fields (`hipaa_initial_training_date`, `hipaa_last_refresher_date`, `hipaa_next_refresher_due`, `hipaa_certification_status`).
    - *Disciplinary Sanctions Log*: Records privacy/security infractions (`SAN-YYYY-XXXX`), policy violated, severity tiers, investigation findings, corrective action plans, optional link to `hipaa_security_incidents`, officer signoffs, and printable OCR Sanction Dossiers.
  - *Automated Account Lockout Enforcement*: Selecting the `immediate_termination` sanction tier automatically triggers an irreversible administrative user lock (`is_locked = 1`, `locked_until = '2099-12-31 23:59:59'`) to immediately sever ePHI access.
  - *Staff Directory Integration*: Adds color-coded certification badges (`Compliant`, `Due Soon`, `Overdue`, `Exempt`) to the Employee Directory table and dedicated HIPAA fields to the Add/Edit Employee modal.
  - *Compliance Registries & Chained Audit Logging*: Database schema migration 209 (`employees` extension, `hipaa_workforce_trainings`, `hipaa_workforce_sanctions`), RFC 4180 CSV exports (`/api/workforce-governance/trainings/export` and `/api/workforce-governance/sanctions/export`), and sequential HMAC-SHA-256 cryptographically chained audit logging in `hipaa_audit_logs` under `CATEGORY_WORKFORCE`.

---

## 6. Backend Architecture & API Design

### Route Definitions
Routes are registered modularly within each module directory (`backend/app/Modules/<ModuleName>/routes.php`):

```php
// Example: backend/app/Modules/Auth/routes.php
$router->post('/login', [AuthController::class, 'login']);
$router->post('/verify-2fa', [AuthController::class, 'verifyTwoFactor']);
$router->put('/auth/first-login', [AuthController::class, 'completeFirstLogin'], [AuthMiddleware::class]);
$router->put('/auth/expired-password', [AuthController::class, 'updateExpiredPassword']);
$router->post('/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->get('/ping', [AuthController::class, 'ping'], [AuthMiddleware::class]);
```

### Standard Response Structure
All API endpoints return a standardized JSON response:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... },
  "errors": null
}
```

When validation fails:
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "new_password": "Password must contain at least one special character."
  }
}
```

---

## 7. Frontend Architecture & Tab Management

### Hash Routing
The client-side router (`frontend/src/core/router.js`) resolves browser location hash changes:
- `#/login`: Authentication view, 2FA prompt, first-login setup, expired password renewal.
- `#/dashboard`: Primary hospital application shell.
- `#/privacy-policy`: Public HIPAA Notice of Privacy Practices.
- `#/terms-conditions`: Public Terms and Conditions of service.

### Multi-Tab Desktop Emulation (`TabManager`)
- Located in `frontend/src/core/tabs.js`.
- Enables opening multiple patient charts, scheduling flowboards, and billing managers side-by-side.
- State persistence: Remembers active tabs across page refreshes via `localStorage` state serialization.

---

## 8. Database Architecture & Migrations

- Schemas reside in `backend/database/schema/*.sql`.
- Migrations are sequentially numbered (e.g., `001_...sql` to `197_...sql`).
- All tables use the `InnoDB` storage engine with `utf8mb4` character encoding to guarantee ACID transaction safety, foreign key referential integrity, and full multi-byte character support.

---

## 9. Directory Structure

```
usintellix-hospital-management-system/
├── backend/
│   ├── app/
│   │   ├── Core/                # Framework Kernel (Router, Database, Model, Controller,
│   │   │                        #  AuditLogger, PasswordSecurity, Session, Cors)
│   │   ├── Middleware/          # AuthMiddleware, RoleGuard
│   │   └── Modules/             # 60+ Domain Modules (Auth, Patients, Inpatient,
│   │                            #  Billing, Encounters, Audit, Profile, etc.)
│   ├── database/
│   │   ├── schema/              # Sequential SQL schema migrations (001 to 197)
│   │   └── seed/                # Standard seed data (Roles, Departments, Codes)
│   ├── public/                  # Document root (index.php, uploads/, assets/)
│   └── .env                     # Server-side environment configuration (Private)
├── frontend/
│   ├── assets/                  # Logos, icons, branding assets
│   ├── src/
│   │   ├── core/                # API client, TabManager, Session, Router, Inactivity Guard
│   │   ├── modules/             # Frontend Views, Controllers, Services
│   │   └── styles/              # Component & theme stylesheets
│   ├── index.html               # Main single-page application entrypoint
│   └── main.js                  # Application bootstrapper
└── docs/
    ├── HIPAA_COMPLIANCE.md      # Regulatory technical HIPAA specification
    ├── SYSTEM_DOCUMENTATION.md  # Master system architecture & module reference
    └── patient-history-module.md# Per-module technical deep dive
```

---

## 10. Installation, Configuration & Deployment

### Prerequisites
- **Web Server**: Apache 2.4+ (with `mod_rewrite` enabled) or Nginx 1.18+.
- **PHP**: PHP 8.0 or higher with extensions: `pdo_mysql`, `mbstring`, `openssl`, `json`, `session`.
- **Database**: MySQL 5.7+ or MariaDB 10.3+.

### Environment Configuration (`backend/.env`)
```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=usintellix_hms
DB_USERNAME=hospital_app_user
DB_PASSWORD=SecureDatabasePassword!

APP_ENV=production
APP_DEBUG=false
APP_URL=https://hospital.example.com

SESSION_SECRET=a_very_long_cryptographically_secure_random_string_here
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=notifications@hospital.example.com
MAIL_PASSWORD=SecureMailPassword!
MAIL_FROM_ADDRESS=notifications@hospital.example.com
MAIL_FROM_NAME="USIntellix Hospital System"
```

### Database Initialization
Execute migrations in numeric order from `backend/database/schema/` followed by reference seeders from `backend/database/seed/`.

---

*USIntellix Hospital Management System Documentation &copy; 2026. All rights reserved.*
