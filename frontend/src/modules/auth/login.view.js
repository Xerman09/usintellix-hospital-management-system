export function LoginView()
{
    return `

<div class="login-container">


    <div class="login-logo">

        <img src="/assets/logo.png">

    </div>


    <h1>
        Welcome back
    </h1>


    <p class="login-subtitle">
        Please enter your credentials to access your account.
    </p>



<form id="loginForm">


<div class="form-group">

<label>
Account
</label>

<input 
class="form-input"
placeholder="e.g Branch / Company code"
>


</div>



<div class="form-group">

<label>
Username
</label>

<input 
id="username"
class="form-input"
placeholder="your.username"
>


</div>



<div class="form-group">

<label>
Password
</label>

<input 
id="password"
type="password"
class="form-input"
placeholder="••••••••"
>


</div>



<div class="login-options">

<label>
<input type="checkbox">
 Remember me
</label>


<a class="forgot-password">
Forgot password?
</a>


</div>



<button 
class="login-btn"
type="submit">

Sign In

</button>



</form>



<p class="register-text">

Don't have a company account?

</p>



<button class="register-btn">

Register Company

</button>


</div>

`;
}