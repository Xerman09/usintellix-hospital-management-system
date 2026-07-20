console.log("auth.js loaded");
import { login } from "./auth.service.js";
import { saveUser } from "../../core/session.js";


export function initLogin()
{
     console.log("initLogin called");

    const form =
        document.getElementById("loginForm");


    form.addEventListener(
        "submit",
        async (event)=>{

            event.preventDefault();


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
                alert(result.message);
                return;
            }


            saveUser(result.data.user);


            window.location.hash =
                "#/dashboard";

        }
    );

}