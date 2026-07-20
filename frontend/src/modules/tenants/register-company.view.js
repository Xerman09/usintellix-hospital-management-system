export function RegisterCompanyView()
{
    return `
<div class="form-page">
    <div class="form-card">
        <h1>Register Company</h1>
        <p class="form-subtitle">Set up your hospital account and your admin login.</p>

        <div id="formAlert"></div>

        <form id="registerCompanyForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Company Name</label>
                    <input id="company_name" class="form-input" placeholder="e.g Intellix Hospital">
                    <span class="form-error" id="err-company_name"></span>
                </div>

                <div class="form-group">
                    <label>Subdomain</label>
                    <input id="subdomain" class="form-input" placeholder="e.g intellix">
                    <span class="form-error" id="err-subdomain"></span>
                </div>

                <div class="form-group">
                    <label>Company Phone</label>
                    <input id="company_phone" class="form-input" placeholder="09XXXXXXXXX">
                    <span class="form-error" id="err-company_phone"></span>
                </div>

                <div class="form-group full">
                    <label>Company Email</label>
                    <input id="company_email" type="email" class="form-input" placeholder="company@example.com">
                    <span class="form-error" id="err-company_email"></span>
                </div>

                <div class="form-group full">
                    <label>Admin Username</label>
                    <input id="username" class="form-input" placeholder="e.g juan.delacruz">
                    <span class="form-error" id="err-username"></span>
                </div>

                <div class="form-group full">
                    <label>Admin Password</label>
                    <input id="password" type="password" class="form-input" placeholder="••••••••">
                    <span class="form-error" id="err-password"></span>
                </div>

                <div class="form-group">
                    <label>First Name</label>
                    <input id="first_name" class="form-input" placeholder="First name">
                    <span class="form-error" id="err-first_name"></span>
                </div>

                <div class="form-group">
                    <label>Middle Name</label>
                    <input id="middle_name" class="form-input" placeholder="Middle name (optional)">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Last Name</label>
                    <input id="last_name" class="form-input" placeholder="Last name">
                    <span class="form-error" id="err-last_name"></span>
                </div>

                <div class="form-group">
                    <label>Suffix</label>
                    <input id="suffix" class="form-input" placeholder="Jr, Sr, III (optional)">
                    <span class="form-error"></span>
                </div>

                <div class="form-group">
                    <label>Sex</label>
                    <select id="sex" class="form-input">
                        <option value="">Select sex</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                    <span class="form-error" id="err-sex"></span>
                </div>

                <div class="form-group">
                    <label>Birthdate</label>
                    <input id="birthdate" type="date" class="form-input">
                    <span class="form-error" id="err-birthdate"></span>
                </div>

                <div class="form-group">
                    <label>Admin Email</label>
                    <input id="email" type="email" class="form-input" placeholder="name@example.com">
                    <span class="form-error" id="err-email"></span>
                </div>

                <div class="form-group">
                    <label>Admin Phone</label>
                    <input id="phone" class="form-input" placeholder="09XXXXXXXXX">
                    <span class="form-error" id="err-phone"></span>
                </div>
            </div>

            <div class="form-actions">
                <a href="#/login" class="btn-secondary">Back to Login</a>
                <button class="login-btn" type="submit">Create Company</button>
            </div>
        </form>
    </div>
</div>
`;
}
