/**
 * Render GAD-7 (General Anxiety Disorder 7) documentation panel markup.
 * Matches standard EHR questionnaire layout with live auto-scoring.
 */
export function renderGad7Html(data = {}) {
    const questions = [
        { id: "q1_feeling_nervous", label: "Feeling nervous, anxious, or on edge" },
        { id: "q2_control_worrying", label: "Not being able to stop or control worrying" },
        { id: "q3_worrying_too_much", label: "Worrying too much about different things" },
        { id: "q4_trouble_relaxing", label: "Trouble relaxing" },
        { id: "q5_hard_to_sit_still", label: "Being so restless that it's hard to sit still" },
        { id: "q6_easily_annoyed", label: "Becoming easily annoyed or irritable" },
        { id: "q7_feeling_afraid", label: "Feeling afraid as if something awful might happen" }
    ];

    const options = [
        { value: "", label: "Please select an answer" },
        { value: "0", label: "Not at all" },
        { value: "1", label: "Several days" },
        { value: "2", label: "More than half the days" },
        { value: "3", label: "Nearly every day" }
    ];

    const questionsHtml = questions.map((q) => {
        const val = data[q.id] !== undefined && data[q.id] !== null ? String(data[q.id]) : "";
        const optionsHtml = options.map((opt) => {
            const isSelected = opt.value !== "" && opt.value === val ? "selected" : "";
            return `<option value="${opt.value}" ${isSelected}>${opt.label}</option>`;
        }).join("");

        return `
            <div class="gad7-question-row">
                <span class="gad7-question-label">${q.label}</span>
                <select class="gad7-select" id="gad7_${q.id}" data-field="${q.id}">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }).join("");

    const initialScoreDisplay = data.formatted_score || "0 - No anxiety disorder";

    return `
    <div class="gad7-container">
        <style>
            .gad7-container {
                padding: 16px 20px 40px 20px;
                background: #ffffff;
                color: #1e293b;
                font-family: inherit;
            }
            .gad7-title {
                font-size: 16px;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 16px 0;
            }
            .gad7-actions-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 24px;
            }
            .gad7-btn {
                background: #ffffff;
                border: 1px solid #71717a;
                border-radius: 3px;
                padding: 4px 10px;
                font-size: 13px;
                font-family: inherit;
                color: #18181b;
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s;
            }
            .gad7-btn:hover {
                background: #f4f4f5;
                border-color: #3f3f46;
            }
            .gad7-btn-primary {
                background: var(--accent, #1d4ed8);
                border-color: var(--accent, #1d4ed8);
                color: #ffffff;
                font-weight: 500;
            }
            .gad7-btn-primary:hover {
                background: #1e40af;
                border-color: #1e40af;
            }
            .gad7-subtitle {
                font-size: 20px;
                font-weight: 500;
                color: #0f172a;
                margin: 0 0 20px 0;
                line-height: 1.3;
            }
            .gad7-question-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }
            .gad7-question-label {
                font-size: 13px;
                color: #334155;
                min-width: 290px;
            }
            .gad7-select {
                padding: 4px 10px;
                border: 1px solid #71717a;
                border-radius: 3px;
                font-size: 13px;
                background-color: #ffffff;
                color: #0f172a;
                outline: none;
                cursor: pointer;
                min-width: 175px;
            }
            .gad7-select:focus {
                border-color: #0284c7;
                box-shadow: 0 0 0 1px #0284c7;
            }
            .gad7-score-wrap {
                margin: 28px 0 24px 0;
            }
            .gad7-score-line {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
                display: inline-block;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 2px;
            }
            :root[data-theme="dark"] .gad7-container {
                background: #182234;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .gad7-title {
                color: #f1f5f9;
            }
            :root[data-theme="dark"] .gad7-subtitle {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .gad7-question-label {
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .gad7-select {
                background: #0f172a;
                color: #f8fafc;
                border-color: #475569;
            }
            :root[data-theme="dark"] .gad7-btn {
                background: #1e293b;
                border-color: #475569;
                color: #f1f5f9;
            }
            :root[data-theme="dark"] .gad7-btn:hover {
                background: #334155;
            }
            :root[data-theme="dark"] .gad7-score-line {
                color: #f8fafc;
                border-color: #f8fafc;
            }
        </style>

        <h3 class="gad7-title">General Anxiety Disorder 7 (GAD-7)</h3>

        <div class="gad7-actions-row">
            <button type="button" class="gad7-btn" id="gad7SaveTopBtn">Save Form</button>
            <button type="button" class="gad7-btn" id="gad7CancelTopBtn">Close without saving</button>
        </div>

        <h2 class="gad7-subtitle">How often have you been bothered by the following over the past 2 weeks?</h2>

        <div class="gad7-questions-list">
            ${questionsHtml}
        </div>

        <div class="gad7-score-wrap">
            <div class="gad7-score-line" id="gad7ScoreLine">
                Total GAD-7 score: <span id="gad7TotalScoreDisplay">${initialScoreDisplay}</span>
            </div>
        </div>

        <div class="gad7-actions-row">
            <button type="button" class="gad7-btn" id="gad7SaveBottomBtn">Save Form</button>
            <button type="button" class="gad7-btn" id="gad7CancelBottomBtn">Close without saving</button>
        </div>
    </div>
    `;
}
