/**
 * The AI analysis panel, for any report screen.
 *
 * Extracted from the claim-denial-pareto screen when AI-3 added five more
 * reports. Copying that panel six times would have meant six places where the
 * "never run on load" rule could be forgotten, and the whole point of that rule
 * is that forgetting it costs money on every page view.
 *
 * Mount it with the report key and a function that returns the report's current
 * filters:
 *
 *     mountAiPanel({
 *         mountId: 'fbiAiPanel',
 *         report: 'financial_executive_overview',
 *         filters: () => ({ month: currentMonth })
 *     });
 *
 * The filters are a function rather than a value so the panel always sends what
 * is on screen now, not what was on screen when the page loaded.
 */

import { api } from '../../core/api.js?v=10';

export function mountAiPanel({ mountId, report, filters = () => ({}), title = 'AI analysis', note = '' }) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const ids = {
        run: `${mountId}_run`,
        usage: `${mountId}_usage`,
        busy: `${mountId}_busy`,
        message: `${mountId}_message`,
        result: `${mountId}_result`,
        summary: `${mountId}_summary`,
        findings: `${mountId}_findings`,
        findingsWrap: `${mountId}_findingsWrap`,
        watch: `${mountId}_watch`,
        watchWrap: `${mountId}_watchWrap`,
        footnote: `${mountId}_footnote`
    };

    mount.innerHTML = `
        <div class="cdp-panel">
            <div class="cdp-panel-header">
                <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2">
                        <path d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9"></path>
                    </svg>
                    ${escapeAi(title)}
                </h3>
                <span style="font-size:12px; color:#64748b;">
                    ${escapeAi(note || 'Reads the aggregate figures on this screen. Patient-level rows are never sent.')}
                </span>
            </div>
            <div style="padding:14px 16px;">
                <div id="${ids.run}_wrap">
                    <button class="cdp-btn cdp-btn-primary" id="${ids.run}">Analyse these figures</button>
                    <span id="${ids.usage}" style="font-size:12px; color:#64748b; margin-left:12px;"></span>
                </div>
                <div id="${ids.busy}" style="display:none; font-size:13px; color:#64748b;">Reading the figures&hellip;</div>
                <div id="${ids.message}" style="display:none; font-size:13px; padding:10px 12px; border-radius:6px;
                     background:#fef3c7; color:#92400e; border:1px solid #fde68a;"></div>
                <div id="${ids.result}" style="display:none;">
                    <p id="${ids.summary}" style="margin:0 0 12px; font-size:14px; line-height:1.6; color:#1e293b;"></p>
                    <div id="${ids.findingsWrap}" style="display:none;">
                        <div style="font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Findings</div>
                        <ul id="${ids.findings}" style="margin:0 0 12px 18px; font-size:13px; line-height:1.7; color:#334155;"></ul>
                    </div>
                    <div id="${ids.watchWrap}" style="display:none;">
                        <div style="font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Worth watching</div>
                        <ul id="${ids.watch}" style="margin:0 0 12px 18px; font-size:13px; line-height:1.7; color:#334155;"></ul>
                    </div>
                    <div id="${ids.footnote}" style="font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:8px;"></div>
                </div>
            </div>
        </div>
    `;

    // Only on a click. Never on load, never on a filter change -- a panel that
    // refreshes itself is the most expensive habit this feature could acquire.
    document.getElementById(ids.run)?.addEventListener('click', () => run());

    refreshUsage();

    async function run() {
        toggle(ids.busy, true);
        toggle(`${ids.run}_wrap`, false);
        toggle(ids.result, false);
        toggle(ids.message, false);

        let res = null;

        try {
            res = await api('/ai/analyse', {
                method: 'POST',
                body: JSON.stringify({ report, filters: filters() || {} })
            });
        } catch (err) {
            res = null;
        }

        toggle(ids.busy, false);
        toggle(`${ids.run}_wrap`, true);

        const data = res?.data ?? res;

        // A refusal is a normal answer with a reason: switched off, over the
        // cap, too soon, provider down. Show the reason.
        if (!res || data?.refused || !data?.analysis) {
            const message = document.getElementById(ids.message);
            if (message) {
                message.textContent = data?.message || 'The analysis could not be generated just now.';
                message.style.display = '';
            }
            refreshUsage();
            return;
        }

        const summary = document.getElementById(ids.summary);
        if (summary) summary.textContent = data.analysis.summary || '';

        fillList(ids.findings, ids.findingsWrap, data.analysis.findings);
        fillList(ids.watch, ids.watchWrap, data.analysis.watch);

        const footnote = document.getElementById(ids.footnote);
        if (footnote) {
            // Whether this is a cached answer matters to somebody comparing the
            // panel against figures they have just re-filtered.
            footnote.textContent = [
                `${data.rows_analysed || 0} rows analysed`,
                data.from_cache ? `cached answer from ${data.generated_at}` : `generated ${data.generated_at}`,
                'figures come from the report, not from the model'
            ].join(' · ');
        }

        toggle(ids.result, true);
        refreshUsage();
    }

    async function refreshUsage() {
        const label = document.getElementById(ids.usage);
        if (!label) return;

        let res = null;

        try {
            res = await api('/ai/usage');
        } catch (err) {
            label.textContent = '';
            return;
        }

        const data = res?.data ?? res;

        if (!data) {
            label.textContent = '';
            return;
        }

        if (!data.enabled) {
            label.textContent = 'AI analysis is switched off for this hospital.';
            const btn = document.getElementById(ids.run);
            if (btn) btn.disabled = true;
            return;
        }

        const spent = Number(data.spend?.today || 0);
        const cap = Number(data.caps?.daily_usd || 0);

        label.textContent = `$${spent.toFixed(2)} of $${cap.toFixed(2)} used today`;
    }

    function fillList(listId, wrapId, items) {
        const list = document.getElementById(listId);
        const wrap = document.getElementById(wrapId);

        if (!list || !wrap) return;

        list.innerHTML = '';

        if (!Array.isArray(items) || items.length === 0) {
            wrap.style.display = 'none';
            return;
        }

        items.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = String(item);
            list.appendChild(li);
        });

        wrap.style.display = '';
    }

    function toggle(id, visible) {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? '' : 'none';
    }
}

function escapeAi(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
