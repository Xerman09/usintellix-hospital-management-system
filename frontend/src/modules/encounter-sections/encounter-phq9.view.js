/**
 * Render PHQ-9 (Patient Health Questionnaire 9) documentation panel markup.
 * Matches standard EHR questionnaire layout with live auto-scoring.
 */
export function renderPhq9Html(data = {}) {
    const questions = [
        { id: "q1_little_interest", label: "1. Little interest or pleasure in doing things" },
        { id: "q2_feeling_down", label: "2. Feeling down, depressed, or hopeless" },
        { id: "q3_sleep_trouble", label: "3. Trouble falling or staying asleep, or sleeping too much" },
        { id: "q4_feeling_tired", label: "4. Feeling tired or having little energy" },
        { id: "q5_poor_appetite", label: "5. Poor appetite or overeating" },
        { id: "q6_feeling_bad_self", label: "6. Feeling bad about yourself - or that you are a failure or have let yourself or your family down" },
        { id: "q7_trouble_concentrating", label: "7. Trouble concentrating on things, such as reading an article or watching videos" },
        { id: "q8_moving_slowly", label: "8. Moving or speaking slowly noted by others or fidgety or restless more than usual" },
        { id: "q9_better_off_dead", label: "9. Thoughts that you would be better off dead, or of hurting yourself" }
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
            <div class="phq9-question-row">
                <span class="phq9-question-label">${q.label}</span>
                <select class="phq9-select" id="phq9_${q.id}" data-field="${q.id}">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }).join("");

    const initialScoreDisplay = data.formatted_score || "0 - No depressive disorder";

    return `
    <div class="phq9-container">
        <style>
            .phq9-container {
                padding: 16px 20px 40px 20px;
                background: #ffffff;
                color: #1e293b;
                font-family: inherit;
            }
            .phq9-title {
                font-size: 16px;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 16px 0;
            }
            .phq9-actions-row {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 24px;
            }
            .phq9-btn {
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
            .phq9-btn:hover {
                background: #f4f4f5;
                border-color: #3f3f46;
            }
            .phq9-btn-primary {
                background: var(--accent, #1d4ed8);
                border-color: var(--accent, #1d4ed8);
                color: #ffffff;
                font-weight: 500;
            }
            .phq9-btn-primary:hover {
                background: #1e40af;
                border-color: #1e40af;
            }
            .phq9-subtitle {
                font-size: 20px;
                font-weight: 500;
                color: #0f172a;
                margin: 0 0 20px 0;
                line-height: 1.3;
            }
            .phq9-question-row {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }
            .phq9-question-label {
                font-size: 13px;
                color: #334155;
                min-width: 290px;
            }
            .phq9-select {
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
            .phq9-select:focus {
                border-color: #0284c7;
                box-shadow: 0 0 0 1px #0284c7;
            }
            .phq9-score-wrap {
                margin: 28px 0 24px 0;
            }
            .phq9-score-line {
                font-size: 14px;
                font-weight: 700;
                color: #0f172a;
                display: inline-block;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 2px;
            }
            :root[data-theme="dark"] .phq9-container {
                background: #182234;
                color: #e2e8f0;
            }
            :root[data-theme="dark"] .phq9-title {
                color: #f1f5f9;
            }
            :root[data-theme="dark"] .phq9-subtitle {
                color: #f8fafc;
            }
            :root[data-theme="dark"] .phq9-question-label {
                color: #cbd5e1;
            }
            :root[data-theme="dark"] .phq9-select {
                background: #0f172a;
                color: #f8fafc;
                border-color: #475569;
            }
            :root[data-theme="dark"] .phq9-btn {
                background: #1e293b;
                border-color: #475569;
                color: #f1f5f9;
            }
            :root[data-theme="dark"] .phq9-btn:hover {
                background: #334155;
            }
            :root[data-theme="dark"] .phq9-score-line {
                color: #f8fafc;
                border-color: #f8fafc;
            }
        </style>

        <h3 class="phq9-title">Patient Health Questionnaire (PHQ-9)</h3>

        <div class="phq9-actions-row">
            <button type="button" class="phq9-btn" id="phq9SaveTopBtn">Save Form</button>
            <button type="button" class="phq9-btn" id="phq9CancelTopBtn">Close without saving</button>
        </div>

        <h2 class="phq9-subtitle">How often have you been bothered by the following over the past 2 weeks?</h2>

        <div class="phq9-questions-list">
            ${questionsHtml}
        </div>

        <div class="phq9-score-wrap">
            <div class="phq9-score-line" id="phq9ScoreLine">
                Total PHQ-9 score: <span id="phq9TotalScoreDisplay">${initialScoreDisplay}</span>
            </div>
        </div>

        <div class="phq9-actions-row">
            <button type="button" class="phq9-btn" id="phq9SaveBottomBtn">Save Form</button>
            <button type="button" class="phq9-btn" id="phq9CancelBottomBtn">Close without saving</button>
        </div>
    </div>
    `;
}
