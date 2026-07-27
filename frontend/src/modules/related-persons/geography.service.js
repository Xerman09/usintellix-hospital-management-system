const COUNTRIES_API = "https://restcountries.com/v3.1/all?fields=name";
const PH_PROVINCES_API = "https://psgc.gitlab.io/api/provinces/";

let countriesCache = null;
let phProvincesCache = null;

/**
 * Fetch a sorted list of country names from restcountries.com.
 * Returns [] on failure (caller should fall back to a plain text input).
 */
export async function fetchCountries()
{
    if (countriesCache) {
        return countriesCache;
    }

    try {
        const response = await fetch(COUNTRIES_API);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        countriesCache = data
            .map((country) => country.name?.common)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        return countriesCache;
    } catch (error) {
        console.error("Failed to fetch countries list", error);
        return [];
    }
}

/**
 * Fetch a sorted list of Philippine province names from the PSGC API.
 * Returns [] on failure (caller should fall back to a plain text input).
 */
export async function fetchPhProvinces()
{
    if (phProvincesCache) {
        return phProvincesCache;
    }

    try {
        const response = await fetch(PH_PROVINCES_API);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        phProvincesCache = data
            .map((province) => province.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        return phProvincesCache;
    } catch (error) {
        console.error("Failed to fetch PH provinces list", error);
        return [];
    }
}

/**
 * True if the given country string is (a variant of) "Philippines",
 * used to decide whether to offer the PSGC province list.
 */
export function isPhilippines(countryValue)
{
    return (countryValue || "").trim().toLowerCase() === "philippines";
}
