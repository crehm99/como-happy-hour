let deals = [];
let currentView = 'day'; 

async function loadDeals() {
    try {
        const response = await fetch('deals.json');
        const data = await response.json();
        deals = data.deals; 
        const footerDate = document.getElementById('update-date');
        if (footerDate) {
            footerDate.innerText = `Deals last verified: ${data.lastUpdated}`;
        }
        updateApp();
    } catch (error) {
        console.error("Critical Error: Could not load deals.json", error);
    }
}

function updateApp() {
    const listContainer = document.getElementById('happy-hour-list');
    const directoryContainer = document.getElementById('full-directory');
    const upcomingContainer = document.getElementById('upcoming-list');
    const timeDisplay = document.getElementById('current-time');
    const searchInput = document.getElementById('directory-search');
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); 
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    if (timeDisplay) {
        timeDisplay.innerText = `It's ${dayNames[currentDay]} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // --- PART A: HAPPENING NOW ---
    const activeDeals = deals.filter(item => 
        item.days.includes(currentDay) && currentHour >= item.start && currentHour < item.end
    );

    if (listContainer) {
        listContainer.innerHTML = activeDeals.length > 0 ? activeDeals.map(item => `
            <div class="deal-card">
                <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                <p>${item.deal}</p>
                <span class="time-badge">Until ${item.end > 12 ? item.end - 12 : item.end} PM</span>
            </div>
        `).join('') : `<p style="text-align:center; color:#888; padding: 20px;">No deals active right now.</p>`;
    }

    // --- PART B: LATER TODAY ---
    const laterTodayDeals = deals.filter(item => 
        item.days.includes(currentDay) && item.start > currentHour
    );
    laterTodayDeals.sort((a, b) => a.start - b.start);

    if (upcomingContainer) {
        upcomingContainer.innerHTML = laterTodayDeals.length > 0 ? `
            <h2 class="section-title">Later Today</h2>
            ${laterTodayDeals.map(item => `
                <div class="deal-card upcoming">
                    <h2><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></h2>
                    <p>${item.deal}</p>
                    <span class="time-badge gray">
                        ${item.start > 12 ? item.start - 12 : item.start} - ${item.end > 12 ? item.end - 12 : item.end} PM
                    </span>
                </div>
            `).join('')}
        ` : "";
    }

    // --- PART C: WEEKLY DIRECTORY ---
    if (directoryContainer) {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
        let directoryHTML = "";
        const filteredDeals = deals.filter(item => item.name.toLowerCase().includes(searchTerm));

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
                            </div>
                            <div class="directory-time">${item.start > 12 ? item.start - 12 : item.start}-${item.end > 12 ? item.end - 12 : item.end} PM</div>
                        </div>
                    `).join('');
                }
            });
        } else {
            const sortedBars = [...filteredDeals].sort((a, b) => a.name.localeCompare(b.name));
            directoryHTML += `<div style="margin-top: 20px;"></div>`;
            directoryHTML += sortedBars.map(item => {
                const daysLabel = item.days.map(d => dayNames[d].substring(0, 3)).join(', ');
                return `
                    <div class="directory-card">
                        <div>
                            <div class="directory-name"><a href="${item.mapLink}" target="_blank" class="map-link">${item.name}</a></div>
                            <div class="directory-details">${item.deal}</div>
                            <div class="day-tags">Available: ${daysLabel}</div>
                        </div>
                        <div class="directory-time">${item.start > 12 ? item.start - 12 : item.start}-${item.end > 12 ? item.end - 12 : item.end} PM</div>
                    </div>
                `;
            }).join('');
        }
        directoryContainer.innerHTML = directoryHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dayBtn = document.getElementById('view-by-day');
    const barBtn = document.getElementById('view-by-bar');
    const searchInput = document.getElementById('directory-search');
    if (dayBtn && barBtn) {
        dayBtn.addEventListener('click', () => { currentView = 'day'; dayBtn.classList.add('active'); barBtn.classList.remove('active'); updateApp(); });
        barBtn.addEventListener('click', () => { currentView = 'bar'; barBtn.classList.add('active'); dayBtn.classList.remove('active'); updateApp(); });
    }
    if (searchInput) { searchInput.addEventListener('input', () => { updateApp(); }); }
    loadDeals();
});