export function LoginView()
{
    return `

<div class="login-page">

    <div class="login-visual">
        <div class="login-visual-content">
            <div class="brand-mark">
                <div class="brand-icon">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
                </div>
                <span>Intellix</span>
            </div>

            <h2>Care coordination,<br>without the chaos.</h2>
            <p>One workspace for patients, providers, and every department in between.</p>

            <ul class="visual-points">
                <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Real-time patient records</li>
                <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Role-based access control</li>
                <li><span class="dot"><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span> Built for multi-department teams</li>
            </ul>
        </div>
    </div>

    <div class="login-form-panel">
        <div class="login-container">

            <div class="login-logo">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
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