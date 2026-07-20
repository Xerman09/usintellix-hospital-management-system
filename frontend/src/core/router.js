import { LoginView } from "../modules/auth/login.view.js";
import { DashboardView } from "../modules/dashboard/dashboard.view.js";
import { Dashboard } from "../modules/dashboard/dashboard.js";
import { initLogin } from "../modules/auth/auth.js";


const app = document.getElementById("app");


const routes = {

    "/login": {
        view: LoginView,
        afterRender: initLogin
    },


    "/dashboard": {
        view: DashboardView,
        afterRender: Dashboard
    }

};



export function router()
{

    function render()
    {

        const path = 
            window.location.hash.replace("#", "")
            || "/login";


        const route = routes[path];


        if (!route)
        {

            app.innerHTML = `
                <h1>
                    404 - Page Not Found
                </h1>
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