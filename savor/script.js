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
    let ampm = hour >= 12 ? "PM" : "AM";
    if (hour === 0 || hour === 24) hour = 12;
    else if (hour > 12) hour -= 12;
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
    const colHour = parseInt(getPart('hour'));
    const colMin = parseInt(getPart('minute'));
    const colDay = getPart('weekday'); 
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames.indexOf(colDay);
    const decimalNow = colHour + (colMin >= 30 ? 0.5 : 0);

    if (timeDisplay) {
        const displayTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true }).format(now);
        timeDisplay.innerText = `It's 5 o'clock somewhere, but in Columbia it's ${colDay} at ${displayTime}`;
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = deals.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesTag = currentTag === 'all' || (item.tags && item.tags.includes(currentTag));
        return matchesSearch && matchesTag;
    });

    const active = filtered.filter(item => {
        if (!item.days.includes(currentDay)) return false;
        const s = item.start, e = item.end === 0 ? 24 : item.end;
        return (e > s) ? (decimalNow >= s && decimalNow < e) : (decimalNow >= s || decimalNow < e);
    });

    if (listContainer) {
        listContainer.innerHTML = active.length > 0 ? `<h2 class="section-title">Happening Now</h2>` + active.map(item => `
            <div class="deal-card">
                <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                <p>${item.deal}</p>
                ${getTagsHTML(item.tags)}
                <span class="card-time">UNTIL ${formatTime(item.end)}</span>
            </div>
        `).join('') : "";
    }

    const upcoming = filtered.filter(item => item.days.includes(currentDay) && item.start > decimalNow);
    upcoming.sort((a, b) => a.start - b.start);
    if (upcomingContainer) {
        upcomingContainer.innerHTML = upcoming.length > 0 ? `<h2 class="section-title">Later Today</h2>` + upcoming.map(item => `
            <div class="deal-card">
                <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                <p>${item.deal}</p>
                ${getTagsHTML(item.tags)}
                <span class="card-time">STARTS ${formatTime(item.start)}</span>
            </div>
        `).join('') : "";
    }

    if (directoryContainer) {
        let html = `<h2 class="section-title">Weekly Directory</h2>`;
        if (currentView === 'day') {
            [1, 2, 3, 4, 5, 6, 0].forEach(dIdx => {
                const dayDeals = filtered.filter(item => item.days.includes(dIdx)).sort((a,b) => a.start - b.start);
                if (dayDeals.length > 0) {
                    html += `<div class="day-header" id="header-${dayNames[dIdx]}">${dayNames[dIdx]}</div>`;
                    html += dayDeals.map(item => `
                        <div class="directory-card">
                            <div style="flex:1;"><a href="${item.mapLink}" target="_blank" class="map-link" style="font-size:1.4rem;">${item.name}</a><div style="margin:5px 0;">${item.deal}</div>${getTagsHTML(item.tags)}</div>
                            <div style="font-weight:900; color:#444;">${formatTime(item.start)} - ${formatTime(item.end)}</div>
                        </div>`).join('');
                }
            });
        } else {
            [...filtered].sort((a,b) => a.name.localeCompare(b.name)).forEach(item => {
                html += `<div class="directory-card"><div style="flex:1;"><a href="${item.mapLink}" target="_blank" class="map-link" style="font-size:1.4rem;">${item.name}</a><div>${item.deal}</div>${getTagsHTML(item.tags)}</div><div style="font-weight:900;">${formatTime(item.start)} - ${formatTime(item.end)}</div></div>`;
            });
        }
        directoryContainer.innerHTML = html;
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
