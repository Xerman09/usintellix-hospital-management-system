import { PracticeRulesView } from "../practice-rules/practice-rules.view.js";

export function PlansConfigurationView()
{
    return `
<style>
.pc-page {
    width: 100%;
    font-size: 13.5px;
}

.pc-plans-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 24px 24px 20px;
}

.pc-plans-row h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.pc-plan-select {
    height: 38px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid #cfd4dc;
    font-size: 13.5px;
    min-width: 200px;
}

.pc-go-btn {
    height: 38px;
    padding: 0 22px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.pc-go-btn:hover {
    background: #1742b0;
}

.pc-divider {
    border: none;
    border-top: 1px solid #e5e9f0;
    margin: 0 24px 8px;
}

:root[data-theme="dark"] .pc-plans-row h1 { color: var(--text-primary); }
:root[data-theme="dark"] .pc-plan-select { background: var(--bg-surface-alt); border-color: var(--border-color); color: var(--text-primary); }
:root[data-theme="dark"] .pc-divider { border-top-color: var(--border-color); }
</style>

<div class="pc-page">
    <div class="pc-plans-row">
        <h1>Plans Configuration</h1>
        <select class="pc-plan-select" id="pcPlanSelect">
            <option value="general">General</option>
        </select>
        <button type="button" class="pc-go-btn" id="pcGoBtn">Go</button>
    </div>
    <hr class="pc-divider">
    ${PracticeRulesView()}
</div>
`;
}
