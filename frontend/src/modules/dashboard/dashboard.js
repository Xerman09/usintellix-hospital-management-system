import { getUser, clearSession } from "../../core/session.js";


export function Dashboard()
{

    const user = getUser();


    if(!user)
    {
        window.location.hash = "#/login";
        return;
    }


    const userInfo =
        document.getElementById("userInfo");


    if (userInfo) {
        userInfo.innerHTML = `

            <p>
                Welcome, ${user.username}
            </p>

            <p>
                Tenant ID: ${user.tenant_id}
            </p>

        `;
    }


    const logoutBtn =
        document.getElementById("logoutBtn");


    if (logoutBtn) {
        logoutBtn.addEventListener(
            "click",
            () => {

                clearSession();

                window.location.hash = "#/login";

            }
        );
    }

}