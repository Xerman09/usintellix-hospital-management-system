console.log("auth.js loaded");
import { login } from "./auth.service.js?v=2";
import { saveUser } from "../../core/session.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { initBranding } from "../../core/branding.js";

const FIELDS = ["username", "password"];
let heroSlideInterval = null;

export function initLogin()
{
     console.log("initLogin called");

    enablePasswordToggles();
    initHeroSlides();
    initBranding();

    const form =
        document.getElementById("loginForm");


    form.addEventListener(
        "submit",
        async (event)=>{

            event.preventDefault();

            clearErrors();


            const username =
                document.getElementById("username").value;


            const password =
                document.getElementById("password").value;


            const result =
                await login(
                    username,
                    password
                );


            console.log(result);


            if(!result.success)
            {
                showAlert(result.message, "error");

                if (result.errors) {
                    Object.entries(result.errors).forEach(([field, message]) => {
                        const errorEl = document.getElementById(`err-${field}`);

                        if (errorEl) {
                            errorEl.textContent = message;
                        }
                    });
                }

                return;
            }


            saveUser(result.data.user);


            window.location.hash =
                "#/dashboard";

        }
    );

}

function initHeroSlides()
{
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dot");
    const bgs = document.querySelectorAll(".hero-bg");

    clearInterval(heroSlideInterval);

    if (!slides.length) {
        return;
    }

    let current = 0;

    const goTo = (index) => {
        slides[current].classList.remove("active");
        dots[current].classList.remove("active");
        bgs[current]?.classList.remove("active");

        current = index;

        slides[current].classList.add("active");
        dots[current].classList.add("active");
        bgs[current]?.classList.add("active");
    };

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => goTo(index));
    });

    heroSlideInterval = setInterval(() => {
        goTo((current + 1) % slides.length);
    }, 6000);
}

function clearErrors()
{
    FIELDS.forEach((field) => {
        const errorEl = document.getElementById(`err-${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showAlert(message, type)
{
    const container = document.getElementById("formAlert");

    if (container) {
        container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
    }
}
