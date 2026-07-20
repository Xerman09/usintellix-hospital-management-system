export function saveUser(user)
{
    sessionStorage.setItem(
        "user",
        JSON.stringify(user)
    );
}


export function getUser()
{
    const user =
        sessionStorage.getItem("user");


    return user
        ? JSON.parse(user)
        : null;
}


export function clearSession()
{
    sessionStorage.removeItem("user");
}


export function isAuthenticated()
{
    return getUser() !== null;
}