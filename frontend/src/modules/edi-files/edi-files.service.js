import { api } from "../../core/api.js";

export async function fetchEdiFiles(status = "new") {
    return api(`/edi-files?status=${status}`);
}

export async function uploadEdiFiles(fileList) {
    const formData = new FormData();

    Array.from(fileList).forEach((file) => formData.append("files[]", file));

    return api("/edi-files", {
        method: "POST",
        headers: {},
        body: formData
    });
}

export async function fetchCsvTable({ table, from, to, encounterId }) {
    const params = new URLSearchParams({ table });

    if (encounterId) {
        params.set("encounter_id", encounterId);
    } else {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
    }

    return api(`/edi-files/csv-table?${params.toString()}`);
}

export async function fetchEdiFilePreview(id) {
    return api(`/edi-files/preview?id=${id}`);
}

export async function fetchEdiFileNotes(ediFileId) {
    return api(`/edi-files/notes?edi_file_id=${ediFileId}`);
}

export async function addEdiFileNote(ediFileId, note) {
    return api("/edi-files/notes", {
        method: "POST",
        body: JSON.stringify({ edi_file_id: ediFileId, note })
    });
}

export async function setEdiFileArchived(id, archived) {
    return api("/edi-files/archive", {
        method: "PUT",
        body: JSON.stringify({ id, archived })
    });
}
