const API_URL = "http://localhost:8000";


export async function api(endpoint, options = {})
{
    const response = await fetch(
        API_URL + endpoint,
        {
            credentials: "include",

            headers:{
                "Content-Type":"application/json"
            },

            ...options
        }
    );


    return await response.json();
}