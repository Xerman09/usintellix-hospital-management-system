export function LoginView()
{
    return `

<div class="login-page">

    <div class="login-visual">
        <div class="hero-watermark"></div>

        <div class="hero-bg hero-bg-1 active" id="heroBg0"></div>
        <div class="hero-bg hero-bg-2" id="heroBg1"></div>
        <div class="hero-bg hero-bg-3" id="heroBg2"></div>

        <div class="login-visual-content">
            <div class="brand-mark">
                <div class="brand-icon">
                    <img src="./assets/logo.png?v=1" alt="Intellix">
                </div>
                <span>Intellix</span>
            </div>

            <div class="hero-slides" id="heroSlides">
                <div class="hero-slide hero-slide-1 active">
                    <h2>Care coordination,<br>without the chaos.</h2>
                    <p>One workspace for patients, providers, and every department in between.</p>
                    <ul class="visual-points">
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Real-time patient records</li>
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Role-based access control</li>
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Built for multi-department teams</li>
                    </ul>
                </div>

                <div class="hero-slide hero-slide-2">
                    <h2>Scheduling that<br>just works.</h2>
                    <p>Keep every provider's calendar, appointments, and encounters in sync, in real time.</p>
                    <ul class="visual-points">
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Provider calendars &amp; availability</li>
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Appointment status tracking</li>
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Encounter history at a glance</li>
                    </ul>
                </div>

                <div class="hero-slide hero-slide-3">
                    <h2>Billing without<br>the guesswork.</h2>
                    <p>Facilities, insurance, and payer codes, organized in one place instead of scattered spreadsheets.</p>
                    <ul class="visual-points">
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Insurance &amp; payer management</li>
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Facility &amp; POS billing codes</li>
                        <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Audit-ready records</li>
                    </ul>
                </div>
            </div>

            <div class="hero-dots" id="heroDots">
                <button type="button" class="hero-dot active" data-index="0" aria-label="Slide 1"></button>
                <button type="button" class="hero-dot" data-index="1" aria-label="Slide 2"></button>
                <button type="button" class="hero-dot" data-index="2" aria-label="Slide 3"></button>
            </div>
        </div>
    </div>

    <div class="login-form-panel">
        <div class="login-container">

            <div class="login-brand">
                <div class="login-logo">
                    <img src="./assets/logo.png?v=1" alt="Intellix">
                </div>
                <span>Intellix</span>
            </div>

            <h1>Welcome back</h1>
            <p class="login-subtitle">Please enter your credentials to access your account.</p>

            <div id="formAlert"></div>

            <form id="loginForm">

                <div class="form-group">
                    <label>Username</label>
                    <input id="username" class="form-input" placeholder="your.username">
                    <span class="form-error" id="err-username"></span>
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <input id="password" type="password" class="form-input" placeholder="••••••••">
                    <span class="form-error" id="err-password"></span>
                </div>

                <div class="login-options">
                    <label><input type="checkbox"> Remember me</label>
                    <a class="forgot-password">Forgot password?</a>
                </div>

                <button class="login-btn" type="submit">Sign In</button>

            </form>

        </div>
    </div>

</div>

`;
}