let deals = [];
let currentView = 'day'; 
let currentTag = 'all'; 

// --- 1. DATA INITIALIZATION & DEEP LINKING ---
async function loadDeals() {
    try {
        const response = await fetch('deals.json?v=' + new Date().getTime());
        const data = await response.json();
        deals = data.deals; 

        // Check if the URL has a specific bar shared (e.g., ?bar=Irene%27s)
        const urlParams = new URLSearchParams(window.location.search);
        const sharedBar = urlParams.get('bar');
        if (sharedBar) {
            const searchInput = document.getElementById('directory-search');
            if (searchInput) {
                searchInput.value = sharedBar;
            }
        }

        const footerDate = document.getElementById('update-date');
        if (footerDate) {
            footerDate.innerText = `Deals last verified: ${data.lastUpdated}`;
        }
        updateApp();
    } catch (error) {
        console.error("Critical Error:", error);
    }
}

// --- 2. HELPER: TIME FORMATTING ---
function formatTime(val) {
    let hour = Math.floor(val);
    let minutes = (val % 1) === 0.5 ? "30" : "00";
    let ampm = "AM";

    if (hour === 0 || hour === 24) {
        hour = 12;
        ampm = "AM";
    } else if (hour === 12) {
        ampm = "PM";
    } else if (hour > 12) {
        hour = hour - 12;
        ampm = "PM";
    } else {
        ampm = "AM";
    }
    return `${hour}:${minutes} ${ampm}`;
}

// --- 3. HELPER: SHARING WITH DEEP LINKS ---
async function shareDeal(name, deal) {
    // This creates a unique URL for the specific bar
    const shareUrl = `${window.location.origin}${window.location.pathname}?bar=${encodeURIComponent(name)}`;
    
    const shareData = {
        title: 'CoMo Happy Hour',
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

function getTagsHTML(tags) {
    if (!tags || !Array.isArray(tags)) return '';
    return `<div class="tag-container">${tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}</div>`;
}

// --- 4. THE CORE ENGINE ---
function updateApp() {
    const listContainer = document.getElementById('happy-hour-list');
    const directoryContainer = document.getElementById('full-directory');
    const upcomingContainer = document.getElementById('upcoming-list');
    const timeDisplay = document.getElementById('current-time');
    const searchInput = document.getElementById('directory-search');
    
    const now = new Date();
    const currentHourDecimal = now.getHours() + (now.getMinutes() >= 30 ? 0.5 : 0);
    const currentDay = now.getDay(); 
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    if (timeDisplay) {
        timeDisplay.innerText = `It's ${dayNames[currentDay]} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const filteredDeals = deals.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesTag = currentTag === 'all' || (item.tags && item.tags.includes(currentTag));
        return matchesSearch && matchesTag;
    });

    // --- HAPPENING NOW ---
    const activeDeals = filteredDeals.filter(item => {
        if (!item.days.includes(currentDay)) return false;
        const s = item.start;
        const e = item.end === 0 ? 24 : item.end;
        const nowTime = currentHourDecimal;
        return (e > s) ? (nowTime >= s && nowTime < e) : (nowTime >= s || nowTime < e);
    });

    if (listContainer) {
        listContainer.innerHTML = activeDeals.length > 0 ? activeDeals.map(item => `
            <div class="deal-card">
                <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                <p>${item.deal}</p>
                ${getTagsHTML(item.tags)}
                <div class="card-footer">
                    <span class="time-badge">Until ${formatTime(item.end)}</span>
                    <button class="share-btn" data-name="${item.name}" data-deal="${item.deal}">Share ↗</button>
                </div>
            </div>
        `).join('') : `<p style="text-align:center; color:#888; padding: 20px;">No matching deals active now.</p>`;
    }

    // --- LATER TODAY ---
    const laterTodayDeals = filteredDeals.filter(item => 
        item.days.includes(currentDay) && item.start > currentHourDecimal
    );
    laterTodayDeals.sort((a, b) => a.start - b.start);

    if (upcomingContainer) {
        upcomingContainer.innerHTML = laterTodayDeals.length > 0 ? `
            <h2 class="section-title">Later Today</h2>
            ${laterTodayDeals.map(item => `
                <div class="deal-card upcoming">
                    <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                    <p>${item.deal}</p>
                    ${getTagsHTML(item.tags)}
                    <div class="card-footer">
                        <span class="time-badge gray">${formatTime(item.start)} - ${formatTime(item.end)}</span>
                        <button class="share-btn" data-name="${item.name}" data-deal="${item.deal}">Share ↗</button>
                    </div>
                </div>
            `).join('')}
        ` : "";
    }

    // --- DIRECTORY ---
    if (directoryContainer) {
        let directoryHTML = "";
        if (currentView === 'day') {
            const displayOrder = [1, 2, 3, 4, 5, 6, 0]; 
            displayOrder.forEach((dayIndex) => {
                const dayName = dayNames[dayIndex];
                const dealsForDay = filteredDeals.filter(item => item.days.includes(dayIndex));
                dealsForDay.sort((a, b) => a.start - b.start);
                if (dealsForDay.length > 0) {
                    directoryHTML += `<h3 class="day-header">${dayName}</h3>`;
                    directoryHTML += dealsForDay.map(item => `
                        <div class="directory-card">
                            <div>
                                <div class="directory-name"><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></div>
                                <div class="directory-details">${item.deal}</div>
                                ${getTagsHTML(item.tags)}
                                <button class="share-btn mini" data-name="${item.name}" data-deal="${item.deal}">Share Deal</button>
                            </div>
                            <div class="directory-time">${formatTime(item.start)} - ${formatTime(item.end)}</div>
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
                        <div>
                            <div class="directory-name"><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></div>
                            <div class="directory-details">${item.deal}</div>
                            ${getTagsHTML(item.tags)}
                            <div class="day-tags">Available: ${daysLabel}</div>
                            <button class="share-btn mini" data-name="${item.name}" data-deal="${item.deal}">Share Deal</button>
                        </div>
                        <div class="directory-time">${formatTime(item.start)} - ${formatTime(item.end)}</div>
                    </div>
                `;
            }).join('');
        }
        directoryContainer.innerHTML = directoryHTML;
    }
}

// --- 5. INTERACTIVE LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const dayBtn = document.getElementById('view-by-day');
    const barBtn = document.getElementById('view-by-bar');
    const searchInput = document.getElementById('directory-search');
    const tagBtns = document.querySelectorAll('.filter-btn');

    // Handle Share Clicks
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('share-btn')) {
            const name = e.target.getAttribute('data-name');
            const deal = e.target.getAttribute('data-deal');
            shareDeal(name, deal);
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
            currentTag = btn.getAttribute('data-tag');
            updateApp();
        });
    });

    if (searchInput) { searchInput.addEventListener('input', () => { updateApp(); }); }
    loadDeals();
});