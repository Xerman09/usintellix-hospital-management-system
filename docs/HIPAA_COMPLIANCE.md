# HIPAA Compliance & Security Safeguards Specification

**USIntellix Hospital Management System**  
**Regulatory Framework**: Health Insurance Portability and Accountability Act (HIPAA) of 1996  
**Applicable Rules**: Security Rule (45 CFR Part 160 & Part 164, Subparts A and C), Privacy Rule (45 CFR Part 164, Subparts A and E)  
**Classification**: High-Security Electronic Protected Health Information (ePHI) System  
**Last Updated**: September 2026  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [HIPAA Security Rule: Technical Safeguards (§ 164.312)](#2-hipaa-security-rule-technical-safeguards--164312)
   - [Unique User Identification & Access Control (§ 164.312(a)(1))](#unique-user-identification--access-control--164312a1)
   - [Account Lockout & Brute-Force Defense (§ 164.312(a)(2)(i))](#account-lockout--brute-force-defense--164312a2i)
   - [Emergency Access / Break-Glass Procedure (§ 164.312(a)(2)(ii))](#emergency-access--break-glass-procedure--164312a2ii)
   - [Automatic Inactivity Logoff (§ 164.312(a)(2)(iii))](#automatic-inactivity-logoff--164312a2iii)
   - [Cryptographic Audit Controls & Tamper Evidence (§ 164.312(b) & § 164.312(c)(1))](#cryptographic-audit-controls--tamper-evidence--164312b---164312c1)
   - [Transmission Security & Anti-Caching Safeguards (§ 164.312(e)(1))](#transmission-security--anti-caching-safeguards--164312e1)
   - [Field-Level Database Encryption at Rest (AES-256-GCM) (§ 164.312(a)(2)(iv))](#field-level-database-encryption-at-rest-aes-256-gcm--164312a2iv)
3. [HIPAA Security Rule: Administrative Safeguards (§ 164.308)](#3-hipaa-security-rule-administrative-safeguards--164308)
   - [Password Expiration & History Restriction (§ 164.308(a)(5)(ii)(D))](#password-expiration--history-restriction--164308a5iid)
   - [Information Access Management & RBAC (§ 164.308(a)(4))](#information-access-management--rbac--164308a4)
   - [Information System Activity Review (§ 164.308(a)(1)(ii)(D))](#information-system-activity-review--164308a1iid)
4. [HIPAA Privacy Rule Safeguards (§ 164.500 - § 164.534)](#4-hipaa-privacy-rule-safeguards--164500---164534)
   - [Accounting of Disclosures (§ 164.528)](#accounting-of-disclosures--164528)
   - [Notice of Privacy Practices (§ 164.520)](#notice-of-privacy-practices--164520)
   - [Minimum Necessary Standard (§ 164.502(b) & § 164.514(d))](#minimum-necessary-standard--164502b---164514d)
5. [Frontend Secret Isolation & Environmental Controls](#5-frontend-secret-isolation--environmental-controls)
6. [Database Schemas & Audit Trail Structure](#6-database-schemas--audit-trail-structure)
7. [Cryptographic Verification Procedures](#7-cryptographic-verification-procedures)

---

## 1. Executive Summary

The **USIntellix Hospital Management System** is engineered to meet and exceed regulatory compliance standards mandated by the Department of Health and Human Services (HHS) under HIPAA and the HITECH Act. 

The system implements defense-in-depth security controls across all application tiers:
- **Authentication**: Multi-factor authentication (2FA), mandatory first-login credential rotation, automated 90-day password expiration, 5-password history restriction, and automated account lockout for brute-force mitigation.
- **Access Control**: Role-Based Access Control (RBAC), emergency clinical "Break-Glass" protocol with mandatory audit recording, and strict isolation of patient portal accounts.
- **Audit & Integrity**: Append-only, tamper-evident audit trail utilizing sequential SHA-256 HMAC cryptographic hash chaining to verify log immutability.
- **Data Protection**: Anti-caching HTTP headers prohibiting PHI storage on client disks or intermediate proxies, 15-minute inactivity termination, and complete segregation of backend environment secrets.

---

## 2. HIPAA Security Rule: Technical Safeguards (§ 164.312)

### Unique User Identification & Access Control (§ 164.312(a)(1))

#### Requirements
Assign a unique name and/or number for identifying and tracking user identity, and establish procedures to verify identity before granting access to ePHI.

#### System Implementation
1. **Unique Identity Assignment**:
   - Every workforce member (physician, nurse, receptionist, biller, administrator) and patient is assigned a distinct user identity in the `users` table.
   - Usernames are strictly unique; shared or generic logins are prohibited.
2. **Cryptographic Password Storage**:
   - Passwords are encrypted using PHP's native `PASSWORD_BCRYPT` implementation with secure cost parameters. Plaintext passwords are never stored or logged.
3. **Mandatory First-Login Password Reset**:
   - Newly provisioned staff accounts are flagged with `must_change_password = 1`.
   - On first sign-in, standard access is withheld until the user provides their temporary password, verifies their account username, sets a compliant password, and confirms their trusted email address (`PUT /auth/first-login`).
4. **Two-Factor Authentication (2FA)**:
   - Supports time-sensitive one-time passwords (OTP) transmitted via Email or SMS.
   - Codes are stored in `two_factor_codes` with strict expiration windows (10 minutes) and single-use invalidation.

---

### Account Lockout & Brute-Force Defense (§ 164.312(a)(2)(i))

#### Requirements
Implement mechanisms to safeguard against credential stuffing, automated brute-force password guessing, and unauthorized dictionary attacks.

#### System Implementation
1. **Threshold & Rolling Window**:
   - Consecutive failed authentication attempts are tracked per account (`failed_login_attempts`, `last_failed_login_at`, `locked_until`, `is_locked`).
   - A rolling window of **15 minutes (900 seconds)** is enforced: if an authentication failure occurs $> 15$ minutes after a previous failure, the counter automatically resets to 1.
2. **Pre-Lockout Warnings**:
   - Attempts 1 through 4 return an explicit warning counter informing the user of remaining attempts (e.g., *"Warning: 2 attempt(s) remaining before account lockout."*).
3. **Automated 30-Minute Lockout**:
   - Upon the 5th consecutive failure, the account status transitions to `is_locked = 1` with a lockout timestamp set to `NOW() + 30 MINUTES`.
   - Any further login attempt—even if supplied with the correct password—is categorically rejected during the lockout period.
   - An immutable audit log (`ACCOUNT_LOCKED`) is recorded into `hipaa_audit_logs`.
4. **Administrative Manual Unlock**:
   - System administrators can monitor real-time lockout status in the **Admin &rarr; Users** console (`Active`, `Failed Attempts X/5`, or `Locked (Brute Force)`).
   - Authorized administrators can manually unlock the account via `PUT /employees/:id/unlock`. The unlock action resets the failed counter, clears the timestamp, sets `is_locked = 0`, and records an `ACCOUNT_UNLOCKED` audit entry with the administrator's identity.
5. **Automatic Cooldown Expiry**:
   - Once the 30-minute lockout cooldown has elapsed, the account automatically clears its lockout status upon the next valid sign-in without requiring administrative intervention.

---

### Emergency Access / Break-Glass Procedure (§ 164.312(a)(2)(ii))

#### Requirements
Establish and implement procedures for obtaining necessary electronic protected health information during an emergency when standard care-team access is unavailable.

#### System Implementation
1. **Restricted Emergency Override**:
   - When an unassigned clinician requires immediate access to an emergency patient's chart, standard access is guarded.
   - The clinician triggers the **Break-Glass Emergency Protocol** (`POST /patients/break-glass`).
2. **Mandatory Clinical Justification**:
   - Access is blocked unless the clinician provides a documented, non-empty clinical justification (e.g., *"Patient presented to emergency department unconscious with acute respiratory distress"*).
3. **Tamper-Evident High-Priority Logging**:
   - The system immediately registers an immutable `BREAK_GLASS` audit record in `hipaa_audit_logs` capturing:
     - Clinician User ID and Role
     - Patient ID
     - IP Address and Timestamp
     - Full clinical justification
4. **Session-Scoped Authorization**:
   - The override grants temporary, audited chart access for the active session, allowing life-saving medical care while maintaining complete traceability.

---

### Automatic Inactivity Logoff (§ 164.312(a)(2)(iii))

#### Requirements
Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity to prevent unauthorized access to unattended clinical workstations.

#### System Implementation
1. **15-Minute Inactivity Threshold**:
   - The frontend inactivity guard (`frontend/src/core/inactivity-guard.js`) monitors user interaction events across the entire document:
     - Mouse movements (`mousemove`, `mousedown`, `click`)
     - Keyboard strokes (`keydown`, `keyup`)
     - Scrolling and touch actions (`scroll`, `touchstart`)
   - Any detected user action resets the inactivity timer.
2. **60-Second Warning Modal**:
   - If no interaction occurs for 14 minutes (840 seconds), a non-dismissible modal appears displaying a real-time 60-second countdown:
     - *"Your session will expire in X seconds due to inactivity in accordance with HIPAA § 164.312(a)(2)(iii)."*
   - Offers two options:
     - **"Continue Working"**: Sends a heartbeat request (`GET /ping`) to refresh the server-side session and resets client timers.
     - **"Log Out Now"**: Immediately ends the session.
3. **Session Invalidation & Redirection**:
   - If the countdown reaches zero, the client automatically executes `POST /logout`, purges session tokens and cached user data from `sessionStorage` and `localStorage`, terminates background watchers, and redirects the browser to `#/login?reason=inactivity`.
   - The login screen displays an informational notice explaining the automatic logoff.

---

### Cryptographic Audit Controls & Tamper Evidence (§ 164.312(b) & § 164.312(c)(1))

#### Requirements
Implement hardware, software, and procedural mechanisms that record and examine activity in information systems containing ePHI, and ensure that electronic media have not been altered or destroyed in an unauthorized manner.

#### System Implementation
1. **Centralized HIPAA Audit Engine (`App\Core\AuditLogger`)**:
   - All critical clinical and administrative events write directly to `hipaa_audit_logs`.
   - Standard categories:
     - `AUTHENTICATION`: Successful logins, logouts, 2FA verifications, failed attempts.
     - `CHART_ACCESS`: Patient chart open, history reviews, vital signs checks.
     - `CLINICAL_DATA`: Patient diagnoses, lab orders, medication changes, encounter notes.
     - `EXPORT_PRINT`: CCDA exports, summary printing, PDF downloads.
     - `DISCLOSURE`: Accounting of disclosures recorded for third parties.
     - `EMERGENCY_ACCESS`: Emergency Break-Glass overrides.
     - `ADMIN_SECURITY`: User creations, role modifications, account lockouts, account unlocks, password changes.
2. **Cryptographic SHA-256 Hash Chaining**:
   - Each audit log entry contains a cryptographic integrity signature (`tamper_hash`).
   - The signature is calculated sequentially over the previous record's hash and current event details:
     $$\text{tamper\_hash}_i = \text{SHA256}(\text{tamper\_hash}_{i-1} \parallel \text{user\_id} \parallel \text{user\_role} \parallel \text{patient\_id} \parallel \text{event\_category} \parallel \text{action} \parallel \text{description} \parallel \text{ip\_address} \parallel \text{created\_at})$$
   - The initial record links to a hardcoded genesis salt (`GENESIS_HIPAA_INTEGRITY_SALT_USINTELLIX_2026`).
3. **Automated Verification Engine**:
   - `AuditLogger::verifyIntegrity(int $limit)` scans the log sequence sequentially.
   - If any row in the database has been modified, backdated, deleted, or injected via direct SQL manipulation, the verification engine detects the broken chain, flags the exact corrupted record ID, and issues an integrity alert.
4. **Administrative Audit Console**:
   - Accessible to compliance and security officers under **Administration &rarr; HIPAA Audit Logs**.
   - Provides filtering by event category, specific action, patient ID, and date range.
   - Features a **"Verify Cryptographic Integrity"** tool that scans thousands of audit entries in real time and reports chain health.

---

### Audit Trail 6-Year Retention & Compliance Export (§ 164.316(b)(2)(i))

#### Requirements
Under HIPAA Security Rule 45 CFR § 164.316(b)(2)(i) (*Standard: Policies and procedures - Time limit*), covered entities and business associates must retain documentation required by the Security Rule for **6 years** from the date of its creation or the date when it last was in effect, whichever is later. Furthermore, audit trails must be exportable in standardized formats for federal Department of Health and Human Services (HHS) Office for Civil Rights (OCR) compliance audits and internal security investigations.

#### System Implementation
1. **Engine-Level Immutable Database Triggers**:
   - `trg_hipaa_audit_logs_retention_guard`: Installed `BEFORE DELETE ON hipaa_audit_logs`. Evaluates `OLD.created_at >= DATE_SUB(NOW(), INTERVAL 6 YEAR)`. Any attempt to delete or purge records younger than 6 years raises an uncatchable `SQLSTATE 45000` database exception:
     > *"HIPAA § 164.316(b)(2)(i) VIOLATION: Immutable retention policy prohibits deletion of audit logs within 6 years of creation."*
   - `trg_hipaa_audit_logs_immutability_guard`: Installed `BEFORE UPDATE ON hipaa_audit_logs`. Blocks any `UPDATE` statements with `SQLSTATE 45000`, guaranteeing append-only permanence.
2. **Centralized Application Retention Guard (`App\Core\AuditRetentionGuard`)**:
   - `getRetentionStatus()` monitors real-time retention metrics:
     - Mandatory retention window: **6 Years (2,191 Days)**
     - Current total protected records: 100% locked under 6-year hold
     - Earliest audit timestamp and active system history days
     - Purge-eligible records: strictly zero until records exceed the 6-year threshold
     - Database engine trigger health verification
   - `assertPurgeEligibility(?string $beforeDate)` rejects premature purge attempts and logs an immutable `ADMIN_SECURITY` event `RETENTION_PURGE_BLOCKED`.
3. **One-Click Compliance Export (CSV & PDF)**:
   - **Official CSV Export (`GET /hipaa-audit-logs/export-csv`)**:
     - Exports records matching active search and date filters.
     - Prepends formal OCR compliance metadata headers:
       - Covered Entity / Hospital: USIntellix Healthcare System
       - Statutory Authority: 45 CFR § 164.312(b) & § 164.316(b)(2)(i)
       - Export Timestamp (UTC) and Exporting Officer credentials
       - Cryptographic SHA-256 HMAC Chain status (Verified Unbroken)
       - Active filter parameters and total records
     - Formatted according to RFC 4180 with client IP, user agent, and full tamper hashes.
     - Logs an immutable `AUDIT_EXPORT_CSV` audit event in the log chain itself.
   - **Print-Ready PDF Audit Report (`GET /hipaa-audit-logs/export-report`)**:
     - Formats formal hospital letterhead, federal compliance stamps, cryptographic verification seal, and statutory 6-year retention certification block.
     - Features dedicated `@media print` styling (landscape orientation, clean pagination, header metadata).
     - Bypasses browser popup blockers via synchronous window initialization, rendering the report and triggering automatic print/Save as PDF.
     - Logs an immutable `AUDIT_EXPORT_PDF` audit event.

---

### Transmission Security & Anti-Caching Safeguards (§ 164.312(e)(1))

#### Requirements
Implement security measures to guard against unauthorized access to ePHI that is being transmitted over an electronic communications network and prevent accidental storage on insecure proxies or endpoints.

#### System Implementation
Global HTTP response headers are injected on every backend request via `App\Core\Cors`:

| Security Header | Value | HIPAA Protection Purpose |
|---|---|---|
| `Cache-Control` | `no-store, no-cache, must-revalidate, max-age=0` | Prohibits browsers, CDNs, and intermediate proxies from storing ePHI on local storage or disk caches. |
| `Pragma` | `no-cache` | Legacy HTTP/1.0 compatibility ensuring no proxy caches clinical data. |
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing responses away from declared Content-Type, mitigating script injection. |
| `X-Frame-Options` | `SAMEORIGIN` | Prohibits embedding clinical workflows in cross-origin iframes (anti-clickjacking defense). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects against leaking patient IDs, encounter IDs, or sensitive URL queries to external referrers. |
| `X-XSS-Protection` | `1; mode=block` | Instructs browsers to halt page rendering if a reflected cross-site scripting attack is detected. |

---

### Field-Level Database Encryption at Rest (AES-256-GCM) (§ 164.312(a)(2)(iv))

#### Requirements
Implement a mechanism to encrypt and decrypt electronic protected health information (ePHI) whenever deemed reasonable and appropriate, safeguarding data at rest against physical storage theft, raw SQL dump exfiltration, or unauthorized backup exposure (45 CFR § 164.312(a)(2)(iv)), while maintaining strict statutory privacy protections for psychotherapy and psychiatric notes (45 CFR § 164.501).

#### Cryptographic Architecture & Specifications
The encryption engine (`App\Core\FieldEncryption`) implements NIST SP 800-38D compliant Galois/Counter Mode authenticated encryption:
- **Cipher Algorithm**: `AES-256-GCM` (Authenticated Encryption with Associated Data / AEAD).
- **Encryption Key**: 256-bit binary symmetric key derived from `DB_ENCRYPTION_KEY` in `backend/.env`.
- **Initialization Vector (IV)**: 96-bit (12 bytes) cryptographically secure pseudorandom IV (`random_bytes(12)`) generated independently for every single field write, ensuring identical plaintexts yield entirely different ciphertexts.
- **Integrity Tag**: 128-bit (16 bytes) authentication tag verified by OpenSSL during decryption; any bit-level tampering or SQL injection corruption immediately fails authentication and aborts plaintext recovery.
- **Serialization Envelope**: `enc:v1:<base64(12-byte IV . 16-byte Tag . Ciphertext)>`.

#### Transparent ORM & QueryBuilder Integration
Encryption and decryption are natively handled by the base ActiveRecord / ORM model layer (`App\Core\QueryBuilder`):
- Models declare protected columns via `protected array $encryptedFields = [...]`.
- **Transparent Write**: When `create()` or `update()` is invoked, fields in `$encryptedFields` are automatically encrypted into `enc:v1:...` envelopes before building the SQL statement.
- **Transparent Read**: When `find()`, `first()`, `get()`, or `all()` is invoked, any value starting with `enc:v1:` is authenticated and decrypted back to plaintext. Direct PDO bulk queries in services invoke `FieldEncryption::decryptRows()`.

#### Protected Fields & Tables Matrix

| Table | Encrypted Columns | HIPAA / Compliance Justification |
|---|---|---|
| `patients` | `ssn`, `national_id` | Direct patient government identifiers (HIPAA Safe Harbor 18 identifiers). |
| `facilities` | `tax_id`, `iban` | Corporate tax numbers and banking routing identifiers. |
| `patient_ledger_payments` | `card_number`, `card_expiry`, `card_cvv` | PCI-DSS / HIPAA financial payment instrument security. |
| `patient_psychiatric_notes` | `psychiatric_notes`, `symptoms`, `confidential_remarks` | Segregated psychotherapy notes under 45 CFR § 164.501, accessible only by assigned clinicians or break-glass override. |
| `encounter_soap_notes` | `subjective`, `objective`, `assessment`, `plan` | Core clinical narratives and diagnostic evaluations. |
| `encounter_clinical_note_items` | `narrative` | Supplemental physician clinical progress entries. |

#### UI Masking & Presentation Safeguards
At the presentation layer, sensitive identifiers are masked by default:
- **SSN**: Masked as `***-**-1234` via `FieldEncryption::maskSsn()`.
- **Payment Cards**: Masked as `**** **** **** 4242` via `FieldEncryption::maskCard()`.
- **National ID**: Masked as `*******4102` via `FieldEncryption::maskNationalId()`.

---

## 3. HIPAA Security Rule: Administrative Safeguards (§ 164.308)

### Password Expiration & History Restriction (§ 164.308(a)(5)(ii)(D))

#### Requirements
Establish password management procedures to ensure regular rotation of credentials, prevent password reuse, and maintain strong complexity requirements.

#### System Implementation
1. **Mandatory 90-Day Password Expiration**:
   - Every user account tracks `password_changed_at` in the `users` table.
   - During authentication, `PasswordSecurity::checkExpirationStatus()` evaluates the age of the credential:
     $$\text{days\_elapsed} = \frac{\text{time}() - \text{strtotime}(\text{password\_changed\_at})}{86400}$$
   - If $\text{days\_elapsed} \ge 90$, standard authentication is halted. The API returns HTTP 401 with `password_expired: true`, `user_id`, and `days_old`.
2. **Previous 5 Passwords History Restriction**:
   - When setting a new password, the system verifies candidate credentials against:
     - The active current password hash in `users`.
     - The previous 5 hashed credentials stored in `user_password_history`.
   - If a match is detected via `password_verify()`, the change is rejected with:
     *"For HIPAA compliance (§ 164.308(a)(5)(ii)(D)), you cannot reuse any of your last 5 passwords."*
   - Upon successful change, `user_password_history` is automatically pruned to retain only the 5 most recent records.
3. **Password Complexity Standard**:
   - Enforced by `PasswordSecurity::validateComplexity()` across all password modification vectors:
     - Minimum length: **8 characters**
     - At least one uppercase English letter (`A-Z`)
     - At least one lowercase English letter (`a-z`)
     - At least one numeric digit (`0-9`)
     - At least one special character (`!@#$%^&*()-_=+[]{}|;:,.<>?/`)
4. **7-Day Advance Expiration Reminder Banner**:
   - For users whose passwords expire in $\le 7$ days, session metadata sets `password_expiring_soon = true` and `days_until_expiration`.
   - The clinical dashboard displays a prominent, non-blocking amber notice:
     *"HIPAA Security Notice (§ 164.308(a)(5)(ii)(D)): Your password will expire in X day(s). [Update Password]"*
   - Clicking the action navigates directly to the profile credential modal.
5. **Unified Enforcement Vectors**:
   - Identical complexity, history restriction, and audit logging apply uniformly to:
     - **Login Expiration Renewal** (`PUT /auth/expired-password`)
     - **First-Login Credential Setup** (`PUT /auth/first-login`)
     - **Self-Service Profile Password Change** (`PUT /profile/password`)

---

### Information Access Management & RBAC (§ 164.308(a)(4))

#### Requirements
Implement policies and procedures for authorizing access to ePHI that are consistent with applicable requirements of the Privacy Rule.

#### System Implementation
1. **Granular Role Hierarchy**:
   - **`admin`**: System configuration, employee lifecycle management, user unlock, HIPAA audit log inspection.
   - **`physician`**: Full clinical encounters, vitals, order entry, prescription writing, Break-Glass emergency access.
   - **`nurse`**: Patient triage, vital signs entry, allergy/medication recording, bed assignment.
   - **`receptionist`**: Patient registration, scheduling, demographics, flow board management. Restricted from progress notes and clinical orders.
   - **`biller`**: Fee sheets, superbills, EDI batch claims, EOB posting. Restricted from clinical narratives.
   - **`patient`**: Patient portal self-service access strictly scoped to their own medical record.
2. **Access Control Lists (ACL)**:
   - Dynamic ACL groups (`acl_groups`) allow fine-tuning access permissions by functional module.
3. **Patient Portal Isolation & Proxy Access**:
   - Patient accounts are bound to a single `patient_id`. Direct API queries for other patient identifiers are forbidden.
   - **Proxy Access Control**: Caregiver or parent access to another patient's record is permitted only when an active, signed proxy consent relationship is verified in `patient_proxies`.

---

### Information System Activity Review (§ 164.308(a)(1)(ii)(D))

#### Requirements
Implement procedures to regularly review records of information system activity, such as audit logs, access reports, and security incident tracking reports.

#### System Implementation
- The **HIPAA Audit Log Console** provides real-time visibility into all staff interactions with ePHI.
- Failed authentication spikes, account lockouts, emergency Break-Glass events, and mass record exports are visually flagged for compliance review.
- Compliance reports can be filtered and reviewed periodically to fulfill recurring compliance reviews.

---

## 4. HIPAA Privacy Rule Safeguards (§ 164.500 - § 164.534)

### Accounting of Disclosures (§ 164.528)

#### Requirements
An individual has a right to receive an accounting of disclosures of protected health information made by a covered entity in the six years prior to the date on which the accounting is requested.

#### System Implementation
- The **Accounting of Disclosures Module** (`backend/app/Modules/Disclosures/`) tracks all external sharing of ePHI:
  - Disclosures to public health authorities (e.g., CDC syndromic surveillance).
  - Subpoenas, law enforcement, and court orders.
  - Workers' compensation and third-party payer audits.
- Each recorded disclosure captures:
  - Date and time of disclosure.
  - Recipient organization and contact details.
  - Specific clinical documents or data elements disclosed.
  - Legal basis / purpose under HIPAA Privacy Rule.
- Patients can request an Accounting of Disclosures report through the Patient Portal or Health Information Management (HIM) department.

---

### Notice of Privacy Practices & Written Acknowledgment Capture (§ 164.520)

#### Requirements
Provide clear notice of the uses and disclosures of protected health information that may be made by the covered entity, and of the individual's rights and the covered entity's legal duties (45 CFR § 164.520(a)-(b)). Furthermore, under **45 CFR § 164.520(c)(2)(ii)**, a covered healthcare provider that has a direct treatment relationship with an individual must make a **good faith effort to obtain a written acknowledgment of receipt of the notice** at the time of first service delivery or initial patient portal access.

#### System Implementation

1. **Patient Portal Electronic Signature Capture Interception**:
   - When a patient authenticates into the portal (`#/login`), the authentication engine inspects `users.npp_acknowledged`.
   - If `npp_acknowledged == 0`, navigation to `#/dashboard` is strictly blocked and the user is routed to the **HIPAA NPP Consent & Signature Step**:
     - Displays an executive summary of patient rights, TPO disclosures, and 256-bit encryption safeguards (referencing the active version, e.g. `v2026-09`).
     - Provides direct deep links to the full [Privacy Policy](file:///c:/xampp/htdocs/usintellix-hospital-management-system/docs/HIPAA_COMPLIANCE.md) (`#/privacy-policy`) and Terms of Service (`#/terms-conditions`).
     - Requires affirmative checkbox acknowledgment for both the Notice of Privacy Practices and Portal Terms of Service.
     - Mandates an electronic signature via typed legal full name attesting patient or authorized representative identity under 45 CFR § 164.520.
   - Upon submission, `POST /auth/npp-acknowledge` records the signature, client IP, timestamp, and version in `users` and inserts a non-repudiable row into `npp_consent_log`.

2. **In-Clinic Check-In Verification & Capture (Patient Flow Board)**:
   - At the clinic reception desk, when staff open the check-in modal (`POST /patient-flow`), the system automatically issues `GET /npp-consent/status?patient_id={id}`.
   - If the patient has acknowledged the NPP, a green verified badge is displayed with the signature timestamp and capture method.
   - If consent is missing, an alert badge is rendered with an integrated **In-Clinic Capture Console**:
     - Staff can select the acknowledgment method: **Electronic / Verbal in Clinic** or **Paper Copy Provided & Physical Signature on File**.
     - Staff record the patient's full name or witness note.
     - `POST /npp-consent/capture` records the event in `npp_consent_log` with `captured_by` set to the staff member's user ID and updates the linked `users` account.

3. **Tamper-Evident Audit Trail & Storage Architecture**:
   - Every acknowledgment generates an audit log in `hipaa_audit_logs` using actions `NPP_ACKNOWLEDGED` (portal self-signature) or `NPP_ACKNOWLEDGED_IN_CLINIC` (staff-assisted capture) within sequential SHA-256 HMAC hash chaining.
   - All consent events are archived in the immutable `npp_consent_log` table:
     ```sql
     npp_consent_log (
         id INT PK AUTO_INCREMENT,
         user_id INT NOT NULL,
         patient_id INT NULL,
         acknowledged_at DATETIME NOT NULL,
         acknowledged_ip VARCHAR(45),
         signature_type VARCHAR(20),  -- 'electronic' | 'in_clinic' | 'paper'
         signature_data TEXT,         -- Typed full legal name or staff note
         npp_version VARCHAR(20),     -- e.g. '2026-09'
         captured_by INT NULL,        -- Staff ID if recorded in clinic
         created_at DATETIME NOT NULL
     )
     ```
   - **Version Invalidation**: Whenever the hospital's privacy practices are materially altered, incrementing `npp_version` triggers re-acknowledgment on next login.

---

### Minimum Necessary Standard (§ 164.502(b) & § 164.514(d))

#### Requirements
When using or disclosing protected health information (PHI) or when requesting ePHI from another covered entity, make reasonable efforts to limit protected health information to the minimum necessary to accomplish the intended purpose. Workforce members must be restricted from accessing sensitive clinical charts (SOAP notes, diagnoses, psychiatric evaluations, and laboratory results) unless authorized by their clinical job role, and clinicians must be bounded to assigned patients unless invoking an emergency override.

#### System Implementation

1. **Centralized Access Control Engine (`App\Core\PhiAccessGuard`)**:
   - Classifies user roles into **Clinical** (`admin`, `doctor`, `clinician`, `nurse`), **Laboratory** (`admin`, `doctor`, `clinician`, `nurse`, `lab_technician`), and **Non-Clinical** (`receptionist`, `accountant`, `staff`, `patient`).
   - Intercepts all clinical endpoint requests. When non-clinical personnel attempt to access clinical charts or lab orders, the engine immediately halts execution with HTTP 403 and error code `HIPAA_NON_CLINICAL_RESTRICTED`.

2. **Hardened Clinical & Sensitive Endpoints**:
   - **SOAP Notes** (`/encounter-soap-notes`): Restricted from non-clinical staff; enforces patient access and blocks unassigned doctors unless emergency Break-Glass is active.
   - **Diagnoses** (`/encounter-diagnoses`): Non-clinical staff blocked; doctors bounded to assigned patients.
   - **Medical Problems** (`/patient-medical-problems`): All CRUD operations guarded by `PhiAccessGuard::assertPatientAccess()`.
   - **Procedure Results & Labs** (`/patient-procedure-results`): Requires `isLabRole`; unassigned doctors must have emergency clearance.
   - **Clinical Encounter Items**: Clinical note items, observation items, review of systems, care plans, clinical instructions, and functional cognitive status items are guarded against non-clinical access.

3. **Clinician Patient-Assignment Boundaries**:
   - Doctors and clinicians are subject to patient assignment boundaries. Access is permitted if and only if:
     - The doctor is the primary attending provider (`patients.provider_id`).
     - The doctor has an appointment scheduled with the patient (`appointments.provider_id`).
     - The doctor has authored or participated in an encounter for the patient (`encounters.encounter_provider_id`).
     - The doctor has active session-scoped Emergency Break-Glass authorization (`Session::get('break_glass_patients')`).
   - If an unassigned physician attempts to access the record, the API returns HTTP 403 with `HIPAA_BREAK_GLASS_REQUIRED` and `break_glass_required: true`.

4. **Emergency Break-Glass Protocol Integration (§ 164.312(a)(2)(ii))**:
   - The frontend (`frontend/src/core/api.js` & `frontend/src/core/break-glass-modal.js`) intercepts `HIPAA_BREAK_GLASS_REQUIRED` and prompts the clinician with a secure Break-Glass modal.
   - The clinician must supply an emergency category (Trauma/Resuscitation, Code Blue/Rapid Response, Unconscious Patient, Covering On-Call Provider, Other Clinical Emergency), a mandatory written clinical justification, and certify under penalty of disciplinary review.
   - Upon submission to `POST /patients/break-glass`, the system creates an immutable, SHA-256 HMAC chained audit log record (`EMERGENCY_ACCESS` / `BREAK_GLASS`) and registers session authorization.
   - Subsequent requests to the patient's clinical chart succeed immediately.

5. **Patient Dashboard Summary Minimum Necessary Filtering**:
   - When non-clinical personnel (e.g. receptionists, billing clerks) load a patient's dashboard summary (`/patients/:id/dashboard-summary`), `PhiAccessGuard::filterDashboardSummary()` automatically redacts all clinical arrays (`soap_notes`, `diagnoses`, `problems`, `medications`, `allergies`, `vitals_history`, `health_concerns`, `prescriptions`, `procedure_results`, `clinical_notes`).
   - Administrative and demographic data (patient demographics, scheduled appointments, billing balances) remain visible to allow scheduling and billing operations without PHI overexposure.
   - Non-clinical views display an amber HIPAA Minimum Necessary notice informing staff that sensitive clinical charts have been redacted in accordance with federal regulations.

---

## 5. Frontend Secret Isolation & Environmental Controls

To prevent credential leakage and ensure zero exposure of infrastructure secrets:
1. **Server-Side Configuration Only**:
   - Database credentials, SMTP mail credentials, session salts, and application encryption keys reside exclusively in the backend `.env` file (`backend/.env`).
2. **Sanitized API Responses**:
   - Backend APIs never return environment configurations, master secrets, or database passwords to client endpoints.
3. **Masking & Preservation**:
   - Administrative interfaces displaying system settings mask sensitive values (e.g., `••••••••`) and preserve existing credentials upon saving if no change was made.
4. **Git Repository Sanitization**:
   - `.env` and sensitive environment configurations are strictly `.gitignore`d.

---

## 6. Database Schemas & Audit Trail Structure

### `hipaa_audit_logs`
```sql
CREATE TABLE IF NOT EXISTS hipaa_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    user_role VARCHAR(50) NULL,
    patient_id INT UNSIGNED NULL,
    event_category ENUM(
        'AUTHENTICATION',
        'CHART_ACCESS',
        'CLINICAL_DATA',
        'EXPORT_PRINT',
        'DISCLOSURE',
        'EMERGENCY_ACCESS',
        'ADMIN_SECURITY'
    ) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255) NULL,
    tamper_hash VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_category (event_category),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `user_password_history`
```sql
CREATE TABLE IF NOT EXISTS user_password_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    CONSTRAINT fk_uph_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `users` (HIPAA Safeguard Columns)
```sql
ALTER TABLE users
    ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN last_failed_login_at DATETIME NULL,
    ADD COLUMN locked_until DATETIME NULL,
    ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN password_changed_at DATETIME NULL,
    ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;
```

---

## 7. Cryptographic Verification Procedures

Security administrators and HIPAA auditors can verify audit trail integrity through the web interface or programmatically via CLI:

### Web Console
1. Log in with an **Administrator** account.
2. Navigate to **Administration &rarr; HIPAA Audit Logs**.
3. Click the **"Verify Cryptographic Integrity"** button.
4. The system validates the SHA-256 hash chain and returns an integrity report.

### Programmatic Verification
```php
use App\Core\AuditLogger;

$result = AuditLogger::verifyIntegrity(5000);

if ($result['valid']) {
    echo "PASS: {$result['message']}\n";
} else {
    echo "ALERT: Integrity breach detected! Corrupted Log ID: {$result['corrupted_id']}\n";
}
```

---

*This document constitutes the official HIPAA technical compliance reference for the USIntellix Hospital Management System.*
