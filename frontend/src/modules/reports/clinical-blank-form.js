import { api } from "../../core/api.js";

async function loadFacilityDetails() {
    try {
        const result = await api(`/facilities`);
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const f = result.data[0];

            let csz = [];
            if (f.physical_city) csz.push(f.physical_city);
            if (f.physical_state) csz.push(f.physical_state);
            if (f.physical_zip) csz.push(f.physical_zip);

            document.querySelectorAll(".cbfFacName").forEach(el => el.textContent = f.name || "Facility");
            document.querySelectorAll(".cbfFacAddress").forEach(el => el.textContent = f.physical_address_line1 || "123 Healthcare Blvd");
            document.querySelectorAll(".cbfFacCityStateZip").forEach(el => el.textContent = csz.length > 0 ? csz.join(", ") : "Medical City, ST 12345");
            document.querySelectorAll(".cbfFacCountry").forEach(el => el.textContent = f.physical_country || "USA");
        }
    } catch (err) {
        console.error("Failed to load facility details", err);
    }
}

export function initClinicalBlankForm() {
    loadFacilityDetails();
}
