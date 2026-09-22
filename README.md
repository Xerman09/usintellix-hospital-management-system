# USIntellix Hospital Management System (HMS / EHR)

Enterprise-grade Electronic Health Record (EHR) and Hospital Information System designed for inpatient hospitals, outpatient clinics, and healthcare networks.

---

## 📚 System Documentation & Compliance

Complete architectural, operational, and regulatory documentation is available in the [`docs/`](docs/) directory:

- **[Master System Documentation](docs/SYSTEM_DOCUMENTATION.md)**: Full architecture breakdown, technology stack, role-based access control matrix (RBAC), clinical modules, inpatient ADT workflows, billing & EDI claims, and installation guide.
- **[HIPAA Compliance & Security Safeguards Specification](docs/HIPAA_COMPLIANCE.md)**: Regulatory-grade reference covering all technical, administrative, and physical safeguards implemented under 45 CFR Parts 160 & 164 (cryptographic audit trail, 90-day password expiration, 5-password history restriction, account brute-force defense, break-glass protocol, and 15-minute inactivity logoff).
- **[Patient History Module Specification](docs/patient-history-module.md)**: Technical guide for the 5-category longitudinal patient history subsystem.

---

## 🔒 HIPAA Security Highlights

- **§ 164.312(a)(1)**: Unique user identification, bcrypt hashing, mandatory first-login credential rotation, and 2FA (SMS/Email OTP).
- **§ 164.312(a)(2)(i)**: Account lockout after 5 consecutive failed attempts within 15 minutes, with 30-minute cooldown or administrator unlock.
- **§ 164.308(a)(5)(ii)(D)**: 90-day mandatory password expiration, 5-password history restriction, and 7-day advance notice banner.
- **§ 164.312(a)(2)(ii)**: Clinical Emergency "Break-Glass" protocol with mandatory clinical justification and immediate high-priority audit logging.
- **§ 164.312(a)(2)(iii)**: 15-minute automatic inactivity session logoff with a 60-second visual countdown warning.
- **§ 164.312(b) & § 164.312(c)(1)**: Tamper-evident audit logging with sequential SHA-256 HMAC cryptographic hash chaining.
- **§ 164.316(b)(2)(i)**: Mandatory 6-year immutable audit retention locked by database triggers (`trg_hipaa_audit_logs_retention_guard` & `trg_hipaa_audit_logs_immutability_guard`) with one-click OCR CSV & print-ready PDF export.
- **§ 164.502(b) & § 164.514(d)**: Strict "Minimum Necessary" PHI access control, redacting clinical charts for non-clinical personnel and enforcing provider patient boundaries.
- **§ 164.312(e)(1)**: Anti-caching headers preventing PHI caching on browser disks or intermediate proxies.
- **§ 164.528**: Full accounting of disclosures module for HIPAA Privacy Rule compliance.

---

## 🚀 Quick Start

### Prerequisites
- **Web Server**: Apache 2.4+ (with `mod_rewrite`) or Nginx 1.18+
- **PHP**: PHP 8.0 or higher with extensions: `pdo_mysql`, `mbstring`, `openssl`, `json`, `session`
- **Database**: MySQL 5.7+ or MariaDB 10.3+

### Configuration
1. Copy `backend/.env.example` (or configure `backend/.env`):
   ```ini
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=usintellix_hms
   DB_USERNAME=root
   DB_PASSWORD=
   APP_ENV=development
   APP_DEBUG=true
   ```
2. Execute SQL schema migrations located in `backend/database/schema/*.sql` in sequential order.
3. Access the application in your browser:
   ```
   http://localhost/usintellix-hospital-management-system/frontend/#/login
   ```

---

*USIntellix Hospital Management System &copy; 2026.*
