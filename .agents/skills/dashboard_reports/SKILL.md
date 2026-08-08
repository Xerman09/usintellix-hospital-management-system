---
name: dashboard_reports
description: Triggers when the user asks to add or modify a report in the patient dashboard, or implement a PDF download functionality for reports.
---

# Dashboard Reports Implementation Guide

When implementing or modifying a report in the patient dashboard, follow these critical architectural patterns to ensure it functions correctly and avoids browser limitations.

## 1. File Locations
- **Logic:** `frontend/src/modules/patients/patients-list.js` (inside `setupReports()`)
- **UI Structure:** `frontend/src/modules/patients/patients-list.view.js`

## 2. Bypassing Popup Blockers (CRITICAL)
Modern browsers will block `window.open` if it occurs asynchronously after a network request. You **MUST** open the popup window synchronously immediately upon the click event, before any `await`.

```javascript
button.addEventListener("click", async () => {
    // 1. Open synchronously BEFORE fetching
    const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to view the report.");
        return;
    }

    // 2. Write a loading state immediately
    reportWindow.document.open();
    reportWindow.document.write(`
        <!DOCTYPE html><html><head><title>Loading...</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2>Generating Report...</h2><p>Please wait.</p>
        </body></html>
    `);
    
    // 3. Perform the asynchronous fetch
    button.disabled = true;
    const result = await fetchPatientDashboardSummary(patientId);
    button.disabled = false;
    
    // 4. Handle Errors
    if (!result.success) {
        reportWindow.document.open();
        reportWindow.document.write(`<h2>Failed to load data.</h2>`);
        reportWindow.document.close();
        return;
    }
    
    // 5. Generate and overwrite the final HTML
    const html = generateYourReportHtml(result.data);
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
});
```

## 3. PDF Generation (Download Button)
To implement a "Download" or "Generate PDF" button for a report, do **not** use heavy third-party libraries unless explicitly requested. Instead, use the native browser print dialog (which allows users to "Save as PDF").

Implement this by following the exact same popup pattern above, but append a script that calls `window.print()` right after writing the HTML:

```javascript
    // ... same as above until step 5 ...
    
    reportWindow.document.open();
    reportWindow.document.write(html);
    
    // Trigger the print dialog automatically
    reportWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
    
    reportWindow.document.close();
```

## 4. UI Consistency
- Buttons should not use hardcoded disabled styles in CSS (e.g. `cursor: not-allowed; opacity: 0.5;` on the base class). Use the `:disabled` pseudo-class in `index.css` or the local view JS style blocks.
- Remove any "(Pop ups need to be enabled)" warnings from the UI, as the synchronous popup pattern guarantees it won't be blocked.
