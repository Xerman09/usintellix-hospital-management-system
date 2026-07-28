const API_URL = `${window.location.protocol}//${window.location.hostname}/usintellix-hospital-management-system/backend/public`;


export async function api(endpoint, options = {})
{
    let response;

    try {
        response = await fetch(
            API_URL + endpoint,
            {
                credentials: "include",

                headers:{
                    "Content-Type":"application/json"
                },

                ...options
            }
        );
    } catch (error) {
        return {
            success: false,
            message: "Unable to reach the server. Please check your connection and try again."
        };
    }

    try {
        return await response.json();
    } catch (error) {
        return {
            success: false,
            message: `Unexpected server response (HTTP ${response.status}).`
        };
    }
}