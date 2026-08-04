export const CODE_TYPES = [
    { value: "CPT4", label: "CPT4 Procedure/Service" },
    { value: "HCPCS", label: "HCPCS Procedure/Service" },
    { value: "CVX", label: "CVX Immunization" },
    { value: "ICD10", label: "ICD10 Diagnosis" },
    { value: "LOINC", label: "LOINC" },
    { value: "PHIN_QUESTIONS", label: "PHIN Questions" },
    { value: "NCI_CONCEPT_ID", label: "NCI Concept ID" },
    { value: "CQM_VALUESET", label: "CQM Valueset" },
    { value: "OID_VALUESET", label: "OID Valueset" }
];

export const CODE_CATEGORIES = [
    "Unassigned",
    "Preventive/Screening",
    "Diagnostic",
    "Laboratory",
    "Radiology",
    "Medicine",
    "Surgery",
    "Evaluation and Management",
    "Injection",
    "Miscellaneous"
];

export function codeTypeLabel(value)
{
    return CODE_TYPES.find((type) => type.value === value)?.label ?? value;
}
