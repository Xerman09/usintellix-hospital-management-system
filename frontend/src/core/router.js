import { LoginView } from "../modules/auth/login.view.js?v=100";
import { DashboardView } from "../modules/dashboard/dashboard.view.js?v=103";
import { Dashboard } from "../modules/dashboard/dashboard.js?v=103";
import { initLogin } from "../modules/auth/auth.js?v=100";
import { AddEmployeeView } from "../modules/employees/add-employee.view.js?v=100";
import { initAddEmployee } from "../modules/employees/add-employee.js?v=100";
import { AddPatientView } from "../modules/patients/add-patient.view.js?v=100";
import { initAddPatient } from "../modules/patients/add-patient.js?v=100";


const app = document.getElementById("app");


const routes = {

    "/login": {
        view: LoginView,
        afterRender: initLogin
    },


    "/dashboard": {
        view: DashboardView,
        afterRender: Dashboard
    },


    "/employees/create": {
        view: AddEmployeeView,
        afterRender: initAddEmployee
    },


    "/patients/create": {
        view: AddPatientView,
        afterRender: initAddPatient
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