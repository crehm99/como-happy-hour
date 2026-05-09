let deals = [];
let currentView = 'day'; 
let currentTag = 'all'; 

// --- 1. DATA INITIALIZATION ---
async function loadDeals() {
    try {
        // Step out of /savor folder to get main deals.json
        const response = await fetch('../deals.json?v=' + new Date().getTime());
        const data = await response.json();
        deals = data.deals; 

        const urlParams = new URLSearchParams(window.location.search);
        const sharedBar = urlParams.get('bar');
        if (sharedBar) {
            const searchInput = document.getElementById('directory-search');
            if (searchInput) searchInput.value = sharedBar;
        }

        const footerDate = document.getElementById('update-date');
        if (footerDate) {
            footerDate.innerText = `Deals last verified: ${data.lastUpdated}`;
        }
        updateApp();
    } catch (error) {
        console.error("Critical Error Loading JSON:", error);
    }
}

// --- 2. HELPERS ---
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
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function shareDeal(name, deal) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?bar=${encodeURIComponent(name)}`;
    const shareData = {
        title: 'Savor Happy Hour',
        text: `Check out this deal at ${name}: ${deal}!`,
        url: shareUrl
    };
    try {
        await navigator.share(shareData);
    } catch (err) {
        navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
        alert('Link copied to clipboard!');
    }
}

// RESTORED: Tag Rendering Logic
function getTagsHTML(tags) {
    if (!tags || !Array.isArray(tags)) return '';
    return `<div class="tag-container" style="margin-top: 8px;">${tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}</div>`;
}

// --- 3. THE CORE ENGINE ---
function updateApp() {
    const listContainer = document.getElementById('happy-hour-list');
    const directoryContainer = document.getElementById('full-directory');
    const upcomingContainer = document.getElementById('upcoming-list');
    const timeDisplay = document.getElementById('current-time');
    const searchInput = document.getElementById('directory-search');
    
    // --- COLUMBIA TIMEZONE LOGIC ---
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour12: false,
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric'
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type).value;

    const columbiaHour = parseInt(getPart('hour'));
    const columbiaMinute = parseInt(getPart('minute'));
    const columbiaDayName = getPart('weekday'); 

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames.indexOf(columbiaDayName);
    const currentHourDecimal = columbiaHour + (columbiaMinute >= 30 ? 0.5 : 0);

    if (timeDisplay) {
        const displayTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true
        }).format(now);
        timeDisplay.innerText = `It's 5 o'clock somewhere, but in Columbia it's ${columbiaDayName} at ${displayTime}`;
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const filteredDeals = deals.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesTag = currentTag === 'all' || (item.tags && item.tags.includes(currentTag));
        return matchesSearch && matchesTag;
    });

    // --- SECTION 1: ACTIVE NOW ---
    const activeDeals = filteredDeals.filter(item => {
        if (!item.days.includes(currentDay)) return false;
        const s = item.start;
        const e = item.end === 0 ? 24 : item.end;
        return (e > s) ? (currentHourDecimal >= s && currentHourDecimal < e) : (currentHourDecimal >= s || currentHourDecimal < e);
    });

    if (listContainer) {
        listContainer.innerHTML = activeDeals.length > 0 ? activeDeals.map(item => `
            <div class="deal-card">
                <div>
                    <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                    <p style="margin: 10px 0;">${item.deal}</p>
                    ${getTagsHTML(item.tags)}
                </div>
                <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top:15px;">
                    <span class="time-badge">Until ${formatTime(item.end)}</span>
                    <button class="share-btn" data-name="${item.name}" data-deal="${item.deal}">Share ↗</button>
                </div>
            </div>
        `).join('') : `<p style="text-align:center; color:#888; padding: 20px;">No matching deals active now.</p>`;
    }

    // --- SECTION 2: LATER TODAY ---
    const laterTodayDeals = filteredDeals.filter(item => 
        item.days.includes(currentDay) && item.start > currentHourDecimal
    );
    laterTodayDeals.sort((a, b) => a.start - b.start);

    if (upcomingContainer) {
        upcomingContainer.innerHTML = laterTodayDeals.length > 0 ? `
            <h2 class="section-title">Later Today</h2>
            ${laterTodayDeals.map(item => `
                <div class="deal-card">
                    <div>
                        <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                        <p style="margin: 10px 0;">${item.deal}</p>
                        ${getTagsHTML(item.tags)}
                    </div>
                    <div class="card-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top:15px;">
                        <span class="time-badge" style="background: #666;">Starts ${formatTime(item.start)}</span>
                        <button class="share-btn" data-name="${item.name}" data-deal="${item.deal}">Share ↗</button>
                    </div>
                </div>
            `).join('')}
        ` : "";
    }

    // --- SECTION 3: WEEKLY DIRECTORY ---
    if (directoryContainer) {
        let directoryHTML = `<h2 class="section-title">Weekly Directory</h2>`;
        if (currentView === 'day') {
            const displayOrder = [1, 2, 3, 4, 5, 6, 0];
            displayOrder.forEach((dayIndex) => {
                const dayName = dayNames[dayIndex];
                const dealsForDay = filteredDeals.filter(item => item.days.includes(dayIndex));
                dealsForDay.sort((a, b) => a.start - b.start);
                if (dealsForDay.length > 0) {
                    directoryHTML += `<h3 class="day-header" id="header-${dayName}">${dayName}</h3>`;
                    directoryHTML += dealsForDay.map(item => `
                        <div class="directory-card">
                            <div style="flex: 1;">
                                <div class="directory-name">${item.name}</div>
                                <div class="directory-details" style="margin: 5px 0;">${item.deal}</div>
                                ${getTagsHTML(item.tags)}
                            </div>
                            <div class="directory-time" style="font-weight: bold; color: #666; min-width: 150px; text-align: right;">
                                ${formatTime(item.start)} - ${formatTime(item.end)}
                            </div>
                        </div>
                    `).join('');
                }
            });
        } else {
            const sortedBars = [...filteredDeals].sort((a, b) => a.name.localeCompare(b.name));
            directoryHTML += sortedBars.map(item => {
                const daysLabel = item.days.map(d => dayNames[d].substring(0, 3)).join(', ');
                return `
                    <div class="directory-card">
                        <div style="flex: 1;">
                            <div class="directory-name">${item.name}</div>
                            <div class="directory-details" style="margin: 5px 0;">${item.deal}</div>
                            ${getTagsHTML(item.tags)}
                            <div style="font-size:0.8rem; color:#888; margin-top:5px;">Available: ${daysLabel}</div>
                        </div>
                        <div class="directory-time" style="font-weight: bold; color: #666; min-width: 150px; text-align: right;">
                            ${formatTime(item.start)} - ${formatTime(item.end)}
                        </div>
                    </div>
                `;
            }).join('');
        }
        directoryContainer.innerHTML = directoryHTML;
    }
}

// --- 4. LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const dayBtn = document.getElementById('view-by-day');
    const barBtn = document.getElementById('view-by-bar');
    const searchInput = document.getElementById('directory-search');
    const tagBtns = document.querySelectorAll('.filter-btn');

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('share-btn')) {
            shareDeal(e.target.dataset.name, e.target.dataset.deal);
        }
    });

    if (dayBtn && barBtn) {
        dayBtn.addEventListener('click', () => { currentView = 'day'; dayBtn.classList.add('active'); barBtn.classList.remove('active'); updateApp(); });
        barBtn.addEventListener('click', () => { currentView = 'bar'; barBtn.classList.add('active'); dayBtn.classList.remove('active'); updateApp(); });
    }

    tagBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tagBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTag = btn.dataset.tag;
            updateApp();
        });
    });

    if (searchInput) searchInput.addEventListener('input', updateApp);
    loadDeals();
});
