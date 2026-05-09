let deals = [];
let currentView = 'day'; 
let currentTag = 'all'; 

async function loadDeals() {
    try {
        const response = await fetch('../deals.json?v=' + new Date().getTime());
        const data = await response.json();
        deals = data.deals; 
        updateApp();
    } catch (error) { console.error("Error:", error); }
}

function formatTime(val) {
    let hour = Math.floor(val);
    let minutes = (val % 1) === 0.5 ? "30" : "00";
    let ampm = "AM";
    if (hour === 0 || hour === 24) { hour = 12; ampm = "AM"; }
    else if (hour === 12) { ampm = "PM"; }
    else if (hour > 12) { hour = hour - 12; ampm = "PM"; }
    return `${hour}:${minutes} ${ampm}`;
}

function scrollToDay(dayId) {
    const element = document.getElementById(`header-${dayId}`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getTagsHTML(tags) {
    if (!tags || !Array.isArray(tags)) return '';
    return `<div class="tag-container">${tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}</div>`;
}

function updateApp() {
    const listContainer = document.getElementById('happy-hour-list');
    const directoryContainer = document.getElementById('full-directory');
    const upcomingContainer = document.getElementById('upcoming-list');
    const timeDisplay = document.getElementById('current-time');
    const searchInput = document.getElementById('directory-search');
    
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, weekday: 'long', hour: 'numeric', minute: 'numeric' });
    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type).value;
    const columbiaHour = parseInt(getPart('hour'));
    const columbiaMinute = parseInt(getPart('minute'));
    const columbiaDayName = getPart('weekday'); 
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames.indexOf(columbiaDayName);
    const currentHourDecimal = columbiaHour + (columbiaMinute >= 30 ? 0.5 : 0);

    if (timeDisplay) {
        const displayTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true }).format(now);
        timeDisplay.innerText = `It's 5 o'clock somewhere, but in Columbia it's ${columbiaDayName} at ${displayTime}`;
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const filteredDeals = deals.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesTag = currentTag === 'all' || (item.tags && item.tags.includes(currentTag));
        return matchesSearch && matchesTag;
    });

    const activeDeals = filteredDeals.filter(item => {
        if (!item.days.includes(currentDay)) return false;
        const s = item.start;
        const e = item.end === 0 ? 24 : item.end;
        return (e > s) ? (currentHourDecimal >= s && currentHourDecimal < e) : (currentHourDecimal >= s || currentHourDecimal < e);
    });

    if (listContainer) {
        listContainer.innerHTML = activeDeals.length > 0 ? `<h2 class="section-title">Happening Now</h2>` + activeDeals.map(item => `
            <div class="deal-card">
                <h2 style="margin:0 0 10px 0; font-weight:900; font-size:1.8rem;">${item.name}</h2>
                <p style="font-size:1.1rem; line-height:1.4;">${item.deal}</p>
                ${getTagsHTML(item.tags)}
                <span class="card-time">UNTIL ${formatTime(item.end)}</span>
            </div>
        `).join('') : "";
    }

    const laterTodayDeals = filteredDeals.filter(item => item.days.includes(currentDay) && item.start > currentHourDecimal);
    laterTodayDeals.sort((a, b) => a.start - b.start);
    if (upcomingContainer) {
        upcomingContainer.innerHTML = laterTodayDeals.length > 0 ? `<h2 class="section-title">Later Today</h2>` + laterTodayDeals.map(item => `
            <div class="deal-card">
                <h2 style="margin:0 0 10px 0; font-weight:900; font-size:1.8rem;">${item.name}</h2>
                <p style="font-size:1.1rem; line-height:1.4;">${item.deal}</p>
                ${getTagsHTML(item.tags)}
                <span class="card-time">STARTS ${formatTime(item.start)}</span>
            </div>
        `).join('') : "";
    }

    if (directoryContainer) {
        let directoryHTML = `<h2 class="section-title">Weekly Directory</h2>`;
        if (currentView === 'day') {
            [1, 2, 3, 4, 5, 6, 0].forEach((dayIndex) => {
                const dealsForDay = filteredDeals.filter(item => item.days.includes(dayIndex));
                dealsForDay.sort((a, b) => a.start - b.start);
                if (dealsForDay.length > 0) {
                    directoryHTML += `<div class="day-header" id="header-${dayNames[dayIndex]}">${dayNames[dayIndex]}</div>`;
                    directoryHTML += dealsForDay.map(item => `
                        <div class="directory-card">
                            <div style="flex: 1;"><div style="font-weight:900; color:var(--savor-blue); font-size:1.4rem; margin-bottom:5px;">${item.name}</div><div style="font-size:1.1rem;">${item.deal}</div>${getTagsHTML(item.tags)}</div>
                            <div style="font-weight:900; color:#444; min-width:160px; text-align:right; font-size:1.1rem;">${formatTime(item.start)} - ${formatTime(item.end)}</div>
                        </div>`).join('');
                }
            });
        } else {
            [...filteredDeals].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
                directoryHTML += `<div class="directory-card"><div style="flex: 1;"><div style="font-weight:900; color:var(--savor-blue); font-size:1.4rem;">${item.name}</div><div>${item.deal}</div>${getTagsHTML(item.tags)}</div><div style="font-weight:900; color:#444;">${formatTime(item.start)} - ${formatTime(item.end)}</div></div>`;
            });
        }
        directoryContainer.innerHTML = directoryHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('directory-search');
    const tagBtns = document.querySelectorAll('.filter-btn');
    const dayBtn = document.getElementById('view-by-day');
    const barBtn = document.getElementById('view-by-bar');
    if (dayBtn && barBtn) {
        dayBtn.addEventListener('click', () => { currentView = 'day'; dayBtn.classList.add('active'); barBtn.classList.remove('active'); document.getElementById('day-nav-container').style.display='flex'; updateApp(); });
        barBtn.addEventListener('click', () => { currentView = 'bar'; barBtn.classList.add('active'); dayBtn.classList.remove('active'); document.getElementById('day-nav-container').style.display='none'; updateApp(); });
    }
    tagBtns.forEach(btn => { btn.addEventListener('click', () => { tagBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentTag = btn.dataset.tag; updateApp(); }); });
    if (searchInput) searchInput.addEventListener('input', updateApp);
    loadDeals();
});
