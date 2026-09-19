import { api } from "../../core/api.js";

async function loadFacilityDetails() {
    try {
        let f = null;
        const facRes = await api('/facilities');
        if (facRes.success && Array.isArray(facRes.data) && facRes.data.length > 0) {
            f = facRes.data[0];
        } else {
            const pendingRes = await api('/reports/procedures/pending');
            if (pendingRes.success && pendingRes.data?.facilities?.length > 0) {
                f = pendingRes.data.facilities[0];
            }
        }

        if (f) {
            const nameEl = document.getElementById("demoFacName");
            const addressEl = document.getElementById("demoFacAddress");
            const cityStateZipEl = document.getElementById("demoFacCityStateZip");
            const countryEl = document.getElementById("demoFacCountry");

            if (nameEl) nameEl.textContent = f.name || "Facility";
            if (addressEl) addressEl.textContent = f.physical_address_line1 || f.address || "123 Healthcare Blvd";

            let csz = [];
            if (f.physical_city || f.city) csz.push(f.physical_city || f.city);
            if (f.physical_state || f.state) csz.push(f.physical_state || f.state);
            if (f.physical_zip || f.zip) csz.push(f.physical_zip || f.zip);

            if (cityStateZipEl) cityStateZipEl.textContent = csz.length > 0 ? csz.join(", ") : "Medical City, ST 12345";
            if (countryEl) countryEl.textContent = f.physical_country || f.country || "USA";
        }
    } catch (err) {
        console.error("Failed to load facility details", err);
    }
}

export function initDemographicsForm() {
    loadFacilityDetails();
}
