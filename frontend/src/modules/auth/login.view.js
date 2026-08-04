export function LoginView()
{
    return `

<div class="login-page">

    <div class="login-atmosphere" aria-hidden="true">
        <div class="login-shards">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div class="login-mesh"></div>
        <div class="login-grain"></div>
    </div>

    <div class="login-container">

        <div class="login-brand">
            <div class="login-logo">
                <img data-app-logo src="./assets/logo.png?v=1" alt="Business logo">
            </div>
            <span data-app-name>Intellix Hospital System</span>
        </div>

        <h1>Login</h1>

        <div id="formAlert"></div>

        <form id="loginForm">

            <div class="form-group">
                <label class="sr-only" for="username">Username</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M20 21c0-3.87-3.58-7-8-7s-8 3.13-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
                    </span>
                    <input id="username" class="form-input" placeholder="Username">
                </div>
                <span class="form-error" id="err-username"></span>
            </div>

            <div class="form-group">
                <label class="sr-only" for="password">Password</label>
                <div class="input-icon-group">
                    <span class="input-icon">
                        <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </span>
                    <input id="password" type="password" class="form-input" placeholder="Password">
                </div>
                <span class="form-error" id="err-password"></span>
            </div>

            <label class="remember-row">
                <input type="checkbox"> Remember me
            </label>

            <button class="login-btn" type="submit">Login</button>

            <p class="login-forgot">Forgot Password? <a class="forgot-password">Click Here</a></p>

            <div class="login-divider"></div>

            <a class="login-secondary-btn">Contact Support</a>

        </form>

    </div>

</div>

`;
}
