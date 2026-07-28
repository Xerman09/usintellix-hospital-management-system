const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Compact month calendar — day number + a dot when that day has
 * appointments, nothing else. Meant to sit in a narrow column next to
 * a day timeline, so it never renders per-appointment chips.
 */
export function renderMiniCalendar({ gridId, labelId, year, month, todayStr, selectedDate, appointmentsByDate, onSelectDate })
{
    const grid = document.getElementById(gridId);
    const label = document.getElementById(labelId);

    if (!grid || !label) {
        return;
    }

    label.textContent = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dowCells = DOW_LABELS.map((letter) => `<div class="mini-cal-dow">${letter}</div>`).join("");

    let dayCells = "";

    for (let i = 0; i < firstDayOfWeek; i++) {
        dayCells += `<div class="mini-cal-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = toDateStr(year, month, day);
        const count = (appointmentsByDate[dateStr] || []).length;
        const classes = ["mini-cal-day"];

        if (dateStr === todayStr) classes.push("today");
        if (dateStr === selectedDate) classes.push("selected");
        if (count > 0) classes.push("has-appointments");

        dayCells += `
            <div class="${classes.join(" ")}" data-date="${dateStr}">
                <span class="mini-cal-day-num">${day}</span>
                ${count ? `<span class="mini-cal-day-dot"></span>` : ""}
            </div>
        `;
    }

    grid.innerHTML = dowCells + dayCells;

    grid.querySelectorAll(".mini-cal-day[data-date]").forEach((cell) => {
        cell.addEventListener("click", () => onSelectDate(cell.getAttribute("data-date")));
    });
}

function toDateStr(year, month, day)
{
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
