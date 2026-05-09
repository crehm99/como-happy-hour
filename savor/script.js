let deals = [];
let currentView = 'day'; 
let currentTag = 'all'; 

async function loadDeals() {
    try {
        // NOTE THE ../ PATHING TO REACH THE MAIN FOLDER
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
        if (footerDate) footerDate.innerText = `Deals last verified: ${data.lastUpdated}`;
        
        updateApp();
    } catch (error) {
        console.error("Error:", error);
    }
}

// Reuse all your previous helper functions (formatTime, shareDeal, scrollToDay, etc.)
function formatTime(val) {
    let hour = Math.floor(val);
    let minutes = (val % 1) === 0.5 ? "30" : "00";
    let ampm = "AM";
    if (hour === 0 || hour === 24) { hour = 12; ampm = "AM"; }
    else if (hour === 12) { ampm = "PM"; }
    else if (hour > 12) { hour = hour - 12; ampm = "PM"; }
    return `${hour}:${minutes} ${ampm}`;
}

async function shareDeal(name, deal) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?bar=${encodeURIComponent(name)}`;
    const shareData = { title: 'Savor Happy Hour', text: `Check out ${name}: ${deal}!`, url: shareUrl };
    try { await navigator.share(shareData); }
    catch (err) { navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`); alert('Link copied!'); }
}

function scrollToDay(dayId) {
    const element = document.getElementById(`header-${dayId}`);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateApp() {
    const listContainer = document.getElementById('happy-hour-list');
    const directoryContainer = document.getElementById('full-directory');
    const upcomingContainer = document.getElementById('upcoming-list');
    const timeDisplay = document.getElementById('current-time');
    const searchInput = document.getElementById('directory-search');
    
    // --- TIMEZONE LOCKED TO COLUMBIA ---
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

    // ACTIVE DEALS
    const activeDeals = filteredDeals.filter(item => {
        if (!item.days.includes(currentDay)) return false;
        const s = item.start;
        const e = item.end === 0 ? 24 : item.end;
        return (e > s) ? (currentHourDecimal >= s && currentHourDecimal < e) : (currentHourDecimal >= s || currentHourDecimal < e);
    });

    if (listContainer) {
        listContainer.innerHTML = activeDeals.map(item => `
            <div class="deal-card">
                <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                <p>${item.deal}</p>
                <div class="card-footer">
                    <span class="time-badge">Until ${formatTime(item.end)}</span>
                    <button class="share-btn" data-name="${item.name}" data-deal="${item.deal}">Share ↗</button>
                </div>
            </div>
        `).join('');
    }

    // DIRECTORY
    if (directoryContainer) {
        let directoryHTML = "";
        const displayOrder = [1, 2, 3, 4, 5, 6, 0];
        displayOrder.forEach((dayIndex) => {
            const dayName = dayNames[dayIndex];
            const dealsForDay = filteredDeals.filter(item => item.days.includes(dayIndex));
            dealsForDay.sort((a, b) => a.start - b.start);
            if (dealsForDay.length > 0) {
                directoryHTML += `<h3 class="day-header" id="header-${dayName}">${dayName}</h3>`;
                directoryHTML += dealsForDay.map(item => `
                    <div class="directory-card">
                        <div>
                            <div class="directory-name">${item.name}</div>
                            <div class="directory-details">${item.deal}</div>
                        </div>
                        <div class="directory-time">${formatTime(item.start)} - ${formatTime(item.end)}</div>
                    </div>
                `).join('');
            }
        });
        directoryContainer.innerHTML = directoryHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('directory-search');
    const tagBtns = document.querySelectorAll('.filter-btn');

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('share-btn')) {
            shareDeal(e.target.dataset.name, e.target.dataset.deal);
        }
    });

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
