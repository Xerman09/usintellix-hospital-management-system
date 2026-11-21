# Brief for the Data Protection Officer and counsel: sending report data to an AI processor

Prepared 21 November 2026, to answer the question left open in
`docs/ai-analysis-plan.md` §A0 before any provider work begins.

**This is not legal advice and is not written by a lawyer.** It is the engineering side
of the question, set out so that someone qualified can answer it without first having to
read the codebase: what the law says, what data would actually leave, and which of the
three possible designs each answer would force. The citations are to the Implementing
Rules and Regulations of RA 10173 as published by the Official Gazette; they were read
directly, not recalled.

---

## 1. The law that applies, and the one the code is written against

Every compliance feature in this system cites **HIPAA** — 45 CFR in the audit logger, the
retention rules, the amendment right, the Safe Harbor de-identifier. HIPAA is a United
States statute and does not govern a hospital in the Philippines.

What governs here is the **Data Privacy Act of 2012 (RA 10173)** and the National Privacy
Commission. The two regimes agree on a great deal, which is why nothing has broken, but
they differ exactly where this question sits.

**Finding worth raising on its own:** IRR **Section 26(a)** requires that any body
processing personal data "shall designate an individual or individuals who shall function
as data protection officer, compliance officer or otherwise be accountable". The system
records two officers — `hipaa_officer_designations`, a privacy officer and a security
officer — and both are **seeded demo rows** from `schema/211_hipaa_officer_designations.sql`,
with names and `@usintellix-hospital.com` addresses that do not correspond to anybody here.
So on the face of the records there is no designated DPO. That obligation exists whether
or not the AI work ever happens.

---

## 2. Health data is prohibited to process, except on a listed basis

IRR **Section 3** defines sensitive personal information to include information "About an
individual's health". IRR **Section 22** then opens: *"The processing of sensitive
personal and privileged information is **prohibited**, except in any of the following
cases"* — and the list is exhaustive. Six bases; the two that matter here:

> **22(a)** Consent is given by data subject … prior to the processing … pursuant to a
> declared, specified, and legitimate purpose;

> **22(e)** The processing is necessary for the purpose of medical treatment: Provided,
> that it is carried out by a **medical practitioner or a medical treatment institution**,
> and an adequate level of protection of personal data is ensured;

**Question 1 for counsel.** 22(e) is what makes this hospital's own handling of its
patients' records lawful. Does it extend to a processor acting on the hospital's
instruction — where that processor is a foreign technology company and plainly not "a
medical practitioner or a medical treatment institution"? Or does the clause attach to who
carries out the processing, in which case 22(e) cannot cover the transfer and something
else must?

That is a sharper question than "is the vendor HIPAA compliant", and it is the question
the whole plan turns on.

**Note what 22(e) cannot reach even if the answer is yes.** It is limited to *medical
treatment*. Most of what the plan proposes is not treatment: the financial and revenue
reports, inventory and procurement, workforce, audit and compliance. If any of those
carry personal data, 22(e) is unavailable to them regardless.

---

## 3. Outsourcing: nine stipulations the contract must contain

IRR **Section 43** permits outsourcing provided the controller uses "contractual or other
reasonable means to ensure that proper safeguards are in place". **Section 44** says what
the contract must say. (a) requires subject matter, duration, nature and purpose, the type
of personal data and categories of data subjects, the controller's obligations and rights,
and "**the geographic location of the processing**". (b) requires the processor to:

1. process only on the controller's **documented instructions**, "including transfers of
   personal data to another country or an international organization, unless such transfer
   is authorized by law";
2. impose confidentiality on authorised persons;
3. implement appropriate security measures and comply with the Act and the Rules;
4. **not engage another processor** without prior instruction, and pass the same
   obligations down if it does;
5. assist the controller in responding to data subject rights requests;
6. assist the controller in demonstrating compliance;
7. at the controller's choice, **delete or return all personal data** at the end of the
   service, "including deleting existing copies unless storage is authorized";
8. make available all information needed to demonstrate compliance, and "allow for and
   contribute to **audits, including inspections**";
9. immediately inform the controller if an instruction appears to infringe the Act.

**Question 2 for counsel.** A vendor's standard terms plus a HIPAA BAA is not this list.
Item 4 (sub-processors), item 7 (deletion on demand, copies included) and item 8 (audit and
inspection rights) are the ones least likely to be satisfied by an American AI provider's
off-the-shelf agreement. Does the hospital need a separate outsourcing agreement — NPC
Model Contractual Clauses, or the ASEAN model clauses — alongside whatever the vendor
offers?

Two engineering facts that bear on item 7 and the retention clause of §A0: the provider's
HIPAA-ready configuration runs with **30-day retention and cannot be combined with
zero-retention**. So "delete on request, copies included" has a 30-day floor by design.

---

## 4. Transfer abroad: no prior approval, but no transfer of responsibility either

IRR **Section 50**: the controller "shall be responsible for any personal data under its
control or custody, including information that have been outsourced or transferred to a
personal information processor or a third party for processing, **whether domestically or
internationally**", and "shall use contractual or other reasonable means to provide a
**comparable level of protection**".

The IRR sets no prior-approval requirement for a transfer abroad. It is a disclosure
instead: **Section 47(a)(5)** makes "**Proposed transfers of personal data outside the
Philippines**" a required content of registration, and 47(a)(2) requires stating "whether
processing is being done under an outsourcing or subcontracting agreement".

**On registration:** Section 47 exempts a controller employing fewer than 250 persons —
*unless* the processing is likely to pose a risk to rights and freedoms, **or the
processing is not occasional, or** it includes sensitive personal information of at least
1,000 individuals. A hospital's processing of patient health records is continuous, so the
exemption appears not to apply however small the staff. **Question 3 for counsel:** is this
system registered with the NPC, and if so does its registration already disclose transfers
abroad, or would it need amending before the first request?

---

## 5. One provision the design must stay clear of

IRR **Section 46(b)** requires notification to the Commission of

> automated processing operations where the processing becomes the **sole basis of making
> decisions that would significantly affect the data subject**.

The plan already forbids the analysis writing anything — §C, "Anything that writes.
Analysis reads and reports. It does not change a dose, a schedule, a price or a claim."
That rule was written for clinical safety. It also keeps this work outside 46(b), and it
should now be treated as a legal boundary rather than a preference. A generated paragraph
that a human reads and acts on is not the sole basis of a decision. A generated paragraph
wired to an action would be.

---

## 6. What would actually leave the building

Per the report groups in the plan:

| Group | Contains personal data? | Realistic basis |
|---|---|---|
| §1 Clinical quality and safety | Yes — health data, SPI | 22(e) if Question 1 resolves favourably; otherwise de-identified only |
| §2 Financial and revenue cycle | Mostly aggregate; patient ledger and AR are per-patient | Aggregate rows carry none; per-patient rows do, and 22(e) does not reach them |
| §3 Operations and flow | Census and queue counts carry none; chart-activity does | Mixed |
| §4 Pharmacy, inventory, supply | Stock movements carry none | Likely outside the DPA entirely |
| §5 Workforce | Employee personal data — SPI where health or discipline | Separate question; staff are data subjects too |
| §6 Compliance and audit | Audit logs name patients and staff | SPI |
| §7 Clinical reference | Yes | SPI |
| §8 Patient-facing | Yes, and read by the patient | Separate decision, per the plan |

---

## 7. The design that makes most of this unnecessary

**Send aggregates, not records.** IRR **Section 26(b)(2)** already points this way: data
protection policies must "by default, ensure only personal data which is necessary for the
specified purpose of the processing are processed".

A narrative summary of a denial-rate pareto does not need a patient's name, number, or
birth date. Neither does an infection trend by ward, a stock-movement anomaly, or a
margin breakdown by cost centre. What the model needs is the shape of the numbers.

Two things make this practical rather than aspirational:

- **The de-identifier already exists.** `DeidentificationService` implements the 18-identifier
  Safe Harbor scrub, with free-text scrubbing, pseudonyms, a re-identification vault held
  back from recipients, and a signed attestation. It was built for research datasets. It
  is the right tool for this too.
- Most reports in §2, §3 and §4 are already aggregate before anything is sent.

**Caveat for counsel, and it matters:** Safe Harbor is a *HIPAA* construct. The DPA has no
equivalent statutory safe harbour; the question under Philippine law is whether the data
subject remains identifiable. Safe Harbor scrubbing is strong evidence toward "no", not an
automatic answer. **Question 4: is a Safe Harbor-scrubbed or aggregated dataset outside the
DPA's scope here, such that §§22, 44 and 50 do not apply to it at all?**

If the answer is yes, the project can start on the de-identified reports — which includes
**claim-denial-pareto**, the one the plan recommends building first — while Questions 1
to 3 are still being worked out.

---

## 8. What attaches regardless, once anything is sent

- **Breach notification**: IRR Section 38 — the Commission *and* affected data subjects,
  within **72 hours** of knowledge or reasonable belief, where SPI was acquired by an
  unauthorised person and there is a real risk of serious harm. A processor incident
  abroad is the hospital's notification to make. 72 hours is tighter than the system's
  existing incident workflow assumes, and nobody has tested it against a processor.
- **Records of processing activities**: Section 26(c).
- **A designated DPO**: Section 26(a) — see §1 above.
- **Privacy Impact Assessment**: the IRR itself is **silent**; the PIA requirement comes
  from NPC issuances rather than the Rules, and confirming which one applies and whether a
  new outsourcing arrangement triggers one is part of Question 3.

---

## 9. What is needed back, in priority order

1. **Question 4 first** — whether de-identified or aggregate data is out of scope. It is
   the cheapest answer to obtain and it unblocks the most work.
2. **Question 1** — whether 22(e) can carry a transfer to a non-clinical processor, and
   what basis covers the non-treatment reports if it cannot.
3. **Question 2** — whether a separate outsourcing agreement is required alongside the
   vendor's own, and who signs it.
4. **Question 3** — the registration position, and the PIA.

Until 4 is answered, nothing is sent. Until 1 to 3 are answered, nothing identifiable is.

**Sources read directly:** IRR of RA 10173, Official Gazette copy, 49 pp. —
Sections 3, 22, 26, 38, 43, 44, 45, 46, 47, 50. The NPC's own site refuses automated
retrieval, so the Official Gazette copy was used; anybody relying on this should check the
wording against the NPC's published text, including any amendment after August 2016.
