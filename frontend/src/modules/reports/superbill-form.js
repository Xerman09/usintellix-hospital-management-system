import { api } from "../../core/api.js";

async function loadFacilityDetails() {
    try {
        const result = await api(`/reports/procedures/pending`); // Reusing to get facilities
        if (result.success && result.data.facilities && result.data.facilities.length > 0) {
            // Get the first facility
            const f = result.data.facilities[0];
            
            const nameEl = document.getElementById("sbFacName");
            const addressEl = document.getElementById("sbFacAddress");
            const cityStateZipEl = document.getElementById("sbFacCityStateZip");
            const countryEl = document.getElementById("sbFacCountry");

            if (nameEl) nameEl.textContent = f.name || "Facility";
            if (addressEl) addressEl.textContent = f.address || "123 Healthcare Blvd";
            
            let csz = [];
            if (f.city) csz.push(f.city);
            if (f.state) csz.push(f.state);
            if (f.zip) csz.push(f.zip);
            
            if (cityStateZipEl) cityStateZipEl.textContent = csz.length > 0 ? csz.join(", ") : "Medical City, ST 12345";
            if (countryEl) countryEl.textContent = f.country || "USA";
        }
    } catch (err) {
        console.error("Failed to load facility details", err);
    }
}

export function initSuperbillForm() {
    loadFacilityDetails();
}
