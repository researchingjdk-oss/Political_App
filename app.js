//NEW TRIAL CODE
// Candidate Dataset (Loaded dynamically from Python backend)
let CANDIDATES = [];

// App State
let activeLevel = "all";
let activeParty = "all";
let searchQuery = "";
let watchlist = new Set();
let compareList = new Set();

// DOM Elements
const candidateGrid = document.getElementById("candidate-grid");
const searchInput = document.getElementById("search-input");
const levelTabs = document.getElementById("level-tabs");
const partySelect = document.getElementById("party-select");
const resultsCount = document.getElementById("results-count");

const watchlistBtn = document.getElementById("open-watchlist-btn");
const watchlistCount = document.getElementById("watchlist-count");
const watchlistDrawer = document.getElementById("watchlist-drawer");
const closeWatchlistDrawer = document.getElementById("close-watchlist-drawer");
const watchlistBody = document.getElementById("watchlist-body");

const compareBtn = document.getElementById("open-compare-btn");
const compareCount = document.getElementById("compare-count");
const compareModal = document.getElementById("compare-modal");
const closeCompareModal = document.getElementById("close-compare-modal");
const compareModalBody = document.getElementById("compare-modal-body");

const detailModal = document.getElementById("detail-modal");
const closeDetailModal = document.getElementById("close-detail-modal");
const detailModalBody = document.getElementById("detail-modal-body");

const changeLocBtn = document.getElementById("change-loc-btn");
const currentLocationText = document.getElementById("current-location-text");

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  await loadCandidatesFromPython();
  setupEventListeners();
});

// Fetch Candidates from Python Backend API
async function loadCandidatesFromPython() {
  try {
    const response = await fetch("http://localhost:8000/api/candidates");
    if (!response.ok) throw new Error("Failed to fetch candidate data from Python server.");
    CANDIDATES = await response.json();
    renderCandidates();
  } catch (error) {
    console.error("Error loading candidates:", error);
    candidateGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-color);"></i>
        <h4>Could not connect to Python backend</h4>
        <p>Make sure to run <code>python candidatedb.py serve</code> in your terminal.</p>
      </div>
    `;
  }
}

// Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCandidates();
  });

  // Level Tabs
  levelTabs.addEventListener("click", (e) => {
    if (e.target.classList.contains("tab-btn")) {
      document.querySelectorAll("#level-tabs .tab-btn").forEach(btn => btn.classList.remove("active"));
      e.target.classList.add("active");
      activeLevel = e.target.dataset.level;
      renderCandidates();
    }
  });

  // Party Filter
  partySelect.addEventListener("change", (e) => {
    activeParty = e.target.value;
    renderCandidates();
  });

  // Location Switcher Simulation
  changeLocBtn.addEventListener("click", () => {
    const cities = ["Fishers, IN (Hamilton Co.)", "Noblesville, IN (Hamilton Co.)", "Carmel, IN (Hamilton Co.)"];
    const currentIdx = cities.indexOf(currentLocationText.textContent);
    const nextIdx = (currentIdx + 1) % cities.length;
    currentLocationText.textContent = cities[nextIdx];
  });

  // Watchlist Drawer Controls
  watchlistBtn.addEventListener("click", () => watchlistDrawer.classList.remove("hidden"));
  closeWatchlistDrawer.addEventListener("click", () => watchlistDrawer.classList.add("hidden"));

  // Compare Modal Controls
  compareBtn.addEventListener("click", openCompareModal);
  closeCompareModal.addEventListener("click", () => compareModal.classList.add("hidden"));

  // Detail Modal Controls
  closeDetailModal.addEventListener("click", () => detailModal.classList.add("hidden"));

  // Close overlays when clicking background
  window.addEventListener("click", (e) => {
    if (e.target === detailModal) detailModal.classList.add("hidden");
    if (e.target === compareModal) compareModal.classList.add("hidden");
    if (e.target === watchlistDrawer) watchlistDrawer.classList.add("hidden");
  });
}

// Filter Logic
function getFilteredCandidates() {
  return CANDIDATES.filter(c => {
    const matchesLevel = activeLevel === "all" || c.level.toLowerCase() === activeLevel.toLowerCase();
    const matchesParty = activeParty === "all" || c.party.toLowerCase() === activeParty.toLowerCase();
    
    const matchesSearch = searchQuery === "" || 
      c.name.toLowerCase().includes(searchQuery) ||
      c.office.toLowerCase().includes(searchQuery) ||
      c.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
      c.bio.toLowerCase().includes(searchQuery);

    return matchesLevel && matchesParty && matchesSearch;
  });
}

// Render Candidates Grid
function renderCandidates() {
  const filtered = getFilteredCandidates();
  resultsCount.textContent = `Showing ${filtered.length} candidate${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    candidateGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-user-slash"></i>
        <h4>No candidates found</h4>
        <p>Try adjusting your search terms or filter selection.</p>
      </div>
    `;
    return;
  }

  candidateGrid.innerHTML = filtered.map(c => {
    const isWatchlisted = watchlist.has(c.id);
    const isCompared = compareList.has(c.id);
    const partyBadgeClass = getPartyBadgeClass(c.party);

    return `
      <div class="candidate-card">
        <div class="card-top">
          <div class="card-top-info">
            <h3>${c.name} ${c.incumbent ? '<span title="Incumbent" style="font-size:0.75rem; color:var(--accent-color);"><i class="fa-solid fa-award"></i></span>' : ''}</h3>
            <div class="office-title">${c.office}</div>
            <div class="badges-row">
              <span class="badge ${partyBadgeClass}">${c.party}</span>
              <span class="badge badge-level">${c.level}</span>
            </div>
          </div>
          <div class="card-actions-top">
            <button class="icon-btn ${isWatchlisted ? 'active' : ''}" onclick="toggleWatchlist(${c.id})" title="Bookmark Candidate">
              <i class="${isWatchlisted ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="card-section-title">Key Focus Areas</div>
          <div class="tag-list">
            ${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <p class="bio-snippet">${c.bio}</p>
        </div>

        <div class="card-footer">
          <label class="checkbox-label">
            <input type="checkbox" ${isCompared ? 'checked' : ''} onchange="toggleCompare(${c.id})">
            Compare
          </label>
          <button class="btn btn-sm btn-outline" onclick="openDetailModal(${c.id})">
            View Platform <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Helpers
function getPartyBadgeClass(party) {
  switch (party) {
    case "Republican": return "badge-rep";
    case "Democratic": return "badge-dem";
    case "Libertarian": return "badge-lib";
    case "Independent": return "badge-ind";
    default: return "";
  }
}

// Watchlist Actions
function toggleWatchlist(id) {
  if (watchlist.has(id)) {
    watchlist.delete(id);
  } else {
    watchlist.add(id);
  }
  watchlistCount.textContent = watchlist.size;
  renderCandidates();
  renderWatchlistDrawer();
}

function renderWatchlistDrawer() {
  if (watchlist.size === 0) {
    watchlistBody.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-bookmark"></i>
        <p>No candidates added to watchlist yet.</p>
      </div>
    `;
    return;
  }

  const items = Array.from(watchlist).map(id => CANDIDATES.find(c => c.id === id)).filter(Boolean);
  watchlistBody.innerHTML = items.map(c => `
    <div class="watchlist-item">
      <div>
        <h5>${c.name}</h5>
        <p>${c.office} (${c.party})</p>
      </div>
      <button class="icon-btn" onclick="toggleWatchlist(${c.id})" title="Remove">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

// Compare Actions
function toggleCompare(id) {
  if (compareList.has(id)) {
    compareList.delete(id);
  } else {
    if (compareList.size >= 4) {
      alert("You can compare up to 4 candidates at a time.");
      renderCandidates();
      return;
    }
    compareList.add(id);
  }
  compareCount.textContent = compareList.size;
  compareBtn.disabled = compareList.size === 0;
  renderCandidates();
}

function openCompareModal() {
  if (compareList.size === 0) return;
  const selected = Array.from(compareList).map(id => CANDIDATES.find(c => c.id === id));

  compareModalBody.innerHTML = selected.map(c => `
    <div class="compare-col">
      <h4>${c.name}</h4>
      <div class="office">${c.office}</div>
      <span class="badge ${getPartyBadgeClass(c.party)}">${c.party}</span>
      
      <div class="compare-section">
        <h5>Background</h5>
        <p>${c.bio}</p>
      </div>

      <div class="compare-section">
        <h5>Key Positions</h5>
        ${c.keyPositions.map(kp => `
          <p style="margin-bottom:0.4rem;"><strong>${kp.issue}:</strong> ${kp.stance}</p>
        `).join('')}
      </div>
    </div>
  `).join('');

  compareModal.classList.remove("hidden");
}

// Detail Modal Action
function openDetailModal(id) {
  const c = CANDIDATES.find(cand => cand.id === id);
  if (!c) return;

  detailModalBody.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
      <div>
        <h2 style="font-size:1.5rem; margin-bottom:0.2rem;">${c.name}</h2>
        <div style="color:var(--primary-color); font-weight:600;">${c.office}</div>
      </div>
      <span class="badge ${getPartyBadgeClass(c.party)}" style="font-size:0.85rem;">${c.party}</span>
    </div>

    <p style="margin-bottom:1.25rem; color:var(--text-muted); line-height:1.6;">${c.bio}</p>

    <h4 style="font-size:1rem; margin-bottom:0.75rem; color:var(--text-primary); border-bottom:1px solid var(--border-color); padding-bottom:0.4rem;">
      <i class="fa-solid fa-list-check"></i> Key Policy Positions
    </h4>

    <div style="display:flex; flex-direction:column; gap:0.85rem; margin-bottom:1.5rem;">
      ${c.keyPositions.map(kp => `
        <div style="background-color:#f8fafc; padding:0.85rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
          <div style="font-weight:700; font-size:0.85rem; color:var(--primary-color); text-transform:uppercase; margin-bottom:0.2rem;">${kp.issue}</div>
          <div style="font-size:0.9rem;">${kp.stance}</div>
        </div>
      `).join('')}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border-color);">
      <a href="${c.website}" target="_blank" rel="noopener" class="btn btn-primary">
        Official Campaign Site <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </a>
      <button class="btn btn-outline" onclick="toggleWatchlist(${c.id})">
        <i class="fa-solid fa-bookmark"></i> ${watchlist.has(c.id) ? 'Saved' : 'Save Candidate'}
      </button>
    </div>
  `;

  detailModal.classList.remove("hidden");
}


//OLD CODE

// // Candidate Dataset
// const CANDIDATES = [
//   {
//     id: 1,
//     name: "Victoria Spartz",
//     party: "Republican",
//     level: "Federal",
//     office: "U.S. House of Representatives (IN-05)",
//     incumbent: true,
//     website: "https://spartz.house.gov",
//     tags: ["Taxes", "Agriculture", "Healthcare", "Economy"],
//     bio: "Current U.S. Representative serving Indiana's 5th Congressional District. Focuses on fiscal responsibility, free-market healthcare reform, and agricultural policy.",
//     keyPositions: [
//       { issue: "Economy", stance: "Advocates for tax cuts, deregulation, and spending caps to curb inflation." },
//       { issue: "Healthcare", stance: "Supports price transparency and interstate health insurance competition." },
//       { issue: "Agriculture", stance: "Promotes deregulation for local farms and expanded trade access." }
//     ]
//   },
//   {
//     id: 2,
//     name: "J.D. Ford",
//     party: "Democratic",
//     level: "Federal",
//     office: "U.S. House of Representatives (IN-05)",
//     incumbent: false,
//     website: "https://fordforindiana.com",
//     tags: ["Education", "Healthcare", "Worker Rights", "Renewable Energy"],
//     bio: "State Senator running for Congressional District 5. Emphasizes public school funding, reproductive freedoms, and expanding healthcare coverage.",
//     keyPositions: [
//       { issue: "Education", stance: "Pushes for increased federal title funding and higher teacher pay standards." },
//       { issue: "Healthcare", stance: "Supports expanding ACA subsidies and lowering prescription drug prices." },
//       { issue: "Energy", stance: "Advocates for federal incentives for clean energy manufacturers in Indiana." }
//     ]
//   },
//   {
//     id: 3,
//     name: "Beau Bayh",
//     party: "Democratic",
//     level: "State",
//     office: "Indiana Secretary of State",
//     incumbent: false,
//     website: "https://beaubayh.com",
//     tags: ["Election Security", "Business Express", "Voter Access"],
//     bio: "Focuses on modernizing Indiana's business registry and expanding voter accessibility through transparent election auditing.",
//     keyPositions: [
//       { issue: "Elections", stance: "Promotes same-day registration and independent post-election auditing." },
//       { issue: "Business", stance: "Aims to streamline online licensing for Hoosier small business owners." }
//     ]
//   },
//   {
//     id: 4,
//     name: "Max Engling",
//     party: "Republican",
//     level: "State",
//     office: "Indiana Secretary of State",
//     incumbent: false,
//     website: "https://maxengling.com",
//     tags: ["Voter ID", "Cybersecurity", "Corporate Compliance"],
//     bio: "Emphasizes strict voter identification enforcement, paper-trail ballot verification, and fraud prevention.",
//     keyPositions: [
//       { issue: "Elections", stance: "Advocates for strict voter ID laws and cleaning up county voter rolls." },
//       { issue: "Security", stance: "Prioritizes cybersecurity defense for county voting machines across IN." }
//     ]
//   },
//   {
//     id: 5,
//     name: "Lauri Shillings",
//     party: "Libertarian",
//     level: "State",
//     office: "Indiana Secretary of State",
//     incumbent: false,
//     website: "https://lpin.org",
//     tags: ["Ballot Access", "Deregulation", "Transparency"],
//     bio: "Advocates for ending single-party election commission control and lowering ballot access hurdles for third parties.",
//     keyPositions: [
//       { issue: "Elections", stance: "Supports ranked-choice voting and open access for third-party candidates." },
//       { issue: "Government", stance: "Pushes for complete openness in public record availability." }
//     ]
//   },
//   {
//     id: 6,
//     name: "Elise Nieshalla",
//     party: "Republican",
//     level: "State",
//     office: "Indiana State Comptroller",
//     incumbent: true,
//     website: "https://in.gov/comptroller",
//     tags: ["Fiscal Auditing", "State Budget", "Transparency"],
//     bio: "Appointed State Comptroller overseeing state accounting, financial transparency portals, and local tax distributions.",
//     keyPositions: [
//       { issue: "Finance", stance: "Promotes online expenditure portals for taxpayer oversight." },
//       { issue: "Fiscal Responsibility", stance: "Prioritizes maintaining Indiana's AAA credit rating." }
//     ]
//   },
//   {
//     id: 7,
//     name: "Christine Altman",
//     party: "Republican",
//     level: "County",
//     office: "Hamilton County Commissioner (District 1)",
//     incumbent: true,
//     website: "https://hamiltoncounty.in.gov",
//     tags: ["Infrastructure", "Transportation", "County Parks"],
//     bio: "Long-serving Hamilton County Commissioner focusing on regional infrastructure improvements, road widening, and drainage control.",
//     keyPositions: [
//       { issue: "Infrastructure", stance: "Leads major road expansion projects connecting Fishers, Carmel, and Noblesville." },
//       { issue: "Parks", stance: "Expands county park trails and greenways." }
//     ]
//   },
//   {
//     id: 8,
//     name: "Stephanie Gilliard",
//     party: "Democratic",
//     level: "County",
//     office: "Hamilton County Council (At-Large)",
//     incumbent: false,
//     website: "https://hamiltoncountydems.org",
//     tags: ["Mental Health", "Public Transit", "Budget Oversight"],
//     bio: "Community leader focused on funding county crisis response teams and promoting affordable housing initiatives.",
//     keyPositions: [
//       { issue: "Mental Health", stance: "Advocates dedicated funding for county co-responder crisis units." },
//       { issue: "Housing", stance: "Supports tax incentives for workforce housing development." }
//     ]
//   },
//   {
//     id: 9,
//     name: "Scott Fadness",
//     party: "Republican",
//     level: "Municipal",
//     office: "Mayor of Fishers",
//     incumbent: true,
//     website: "https://fishers.in.us",
//     tags: ["Economic Dev", "Public Safety", "Smart Cities"],
//     bio: "First Mayor of the City of Fishers. Has spearheaded the redevelopment of the Nickel Plate District and life-science tech hubs.",
//     keyPositions: [
//       { issue: "Economy", stance: "Drives biotech and life-science corporate attraction to Fishers." },
//       { issue: "Public Safety", stance: "Pioneers integrated mental health initiatives within city police & fire." }
//     ]
//   },
//   {
//     id: 10,
//     name: "Jocelyn Vare",
//     party: "Democratic",
//     level: "Municipal",
//     office: "Fishers City Council (At-Large)",
//     incumbent: true,
//     website: "https://jocelynvareforfishers.com",
//     tags: ["Transparency", "Parks & Rec", "Fiscal Responsibility"],
//     bio: "First Democrat elected city-wide in Fishers. Champions fiscal transparency, public engagement, and environmental stewardship.",
//     keyPositions: [
//       { issue: "Transparency", stance: "Pushes for open public commentary periods during city council budgeting." },
//       { issue: "Environment", stance: "Promotes urban canopy retention and green building standards." }
//     ]
//   }
// ];

// // App State
// let activeLevel = "all";
// let activeParty = "all";
// let searchQuery = "";
// let watchlist = new Set();
// let compareList = new Set();

// // DOM Elements
// const candidateGrid = document.getElementById("candidate-grid");
// const searchInput = document.getElementById("search-input");
// const levelTabs = document.getElementById("level-tabs");
// const partySelect = document.getElementById("party-select");
// const resultsCount = document.getElementById("results-count");

// const watchlistBtn = document.getElementById("open-watchlist-btn");
// const watchlistCount = document.getElementById("watchlist-count");
// const watchlistDrawer = document.getElementById("watchlist-drawer");
// const closeWatchlistDrawer = document.getElementById("close-watchlist-drawer");
// const watchlistBody = document.getElementById("watchlist-body");

// const compareBtn = document.getElementById("open-compare-btn");
// const compareCount = document.getElementById("compare-count");
// const compareModal = document.getElementById("compare-modal");
// const closeCompareModal = document.getElementById("close-compare-modal");
// const compareModalBody = document.getElementById("compare-modal-body");

// const detailModal = document.getElementById("detail-modal");
// const closeDetailModal = document.getElementById("close-detail-modal");
// const detailModalBody = document.getElementById("detail-modal-body");

// const changeLocBtn = document.getElementById("change-loc-btn");
// const currentLocationText = document.getElementById("current-location-text");

// // Initialization
// document.addEventListener("DOMContentLoaded", () => {
//   renderCandidates();
//   setupEventListeners();
// });

// // Event Listeners
// function setupEventListeners() {
//   // Search
//   searchInput.addEventListener("input", (e) => {
//     searchQuery = e.target.value.toLowerCase().trim();
//     renderCandidates();
//   });

//   // Level Tabs
//   levelTabs.addEventListener("click", (e) => {
//     if (e.target.classList.contains("tab-btn")) {
//       document.querySelectorAll("#level-tabs .tab-btn").forEach(btn => btn.classList.remove("active"));
//       e.target.classList.add("active");
//       activeLevel = e.target.dataset.level;
//       renderCandidates();
//     }
//   });

//   // Party Filter
//   partySelect.addEventListener("change", (e) => {
//     activeParty = e.target.value;
//     renderCandidates();
//   });

//   // Location Switcher Simulation
//   changeLocBtn.addEventListener("click", () => {
//     const cities = ["Fishers, IN (Hamilton Co.)", "Noblesville, IN (Hamilton Co.)", "Carmel, IN (Hamilton Co.)"];
//     const currentIdx = cities.indexOf(currentLocationText.textContent);
//     const nextIdx = (currentIdx + 1) % cities.length;
//     currentLocationText.textContent = cities[nextIdx];
//   });

//   // Watchlist Drawer Controls
//   watchlistBtn.addEventListener("click", () => watchlistDrawer.classList.remove("hidden"));
//   closeWatchlistDrawer.addEventListener("click", () => watchlistDrawer.classList.add("hidden"));

//   // Compare Modal Controls
//   compareBtn.addEventListener("click", openCompareModal);
//   closeCompareModal.addEventListener("click", () => compareModal.classList.add("hidden"));

//   // Detail Modal Controls
//   closeDetailModal.addEventListener("click", () => detailModal.classList.add("hidden"));

//   // Close overlays when clicking background
//   window.addEventListener("click", (e) => {
//     if (e.target === detailModal) detailModal.classList.add("hidden");
//     if (e.target === compareModal) compareModal.classList.add("hidden");
//     if (e.target === watchlistDrawer) watchlistDrawer.classList.add("hidden");
//   });
// }

// // Filter Logic
// function getFilteredCandidates() {
//   return CANDIDATES.filter(c => {
//     const matchesLevel = activeLevel === "all" || c.level.toLowerCase() === activeLevel.toLowerCase();
//     const matchesParty = activeParty === "all" || c.party.toLowerCase() === activeParty.toLowerCase();
    
//     const matchesSearch = searchQuery === "" || 
//       c.name.toLowerCase().includes(searchQuery) ||
//       c.office.toLowerCase().includes(searchQuery) ||
//       c.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
//       c.bio.toLowerCase().includes(searchQuery);

//     return matchesLevel && matchesParty && matchesSearch;
//   });
// }

// // Render Candidates Grid
// function renderCandidates() {
//   const filtered = getFilteredCandidates();
//   resultsCount.textContent = `Showing ${filtered.length} candidate${filtered.length === 1 ? "" : "s"}`;

//   if (filtered.length === 0) {
//     candidateGrid.innerHTML = `
//       <div class="empty-state" style="grid-column: 1 / -1;">
//         <i class="fa-solid fa-user-slash"></i>
//         <h4>No candidates found</h4>
//         <p>Try adjusting your search terms or filter selection.</p>
//       </div>
//     `;
//     return;
//   }

//   candidateGrid.innerHTML = filtered.map(c => {
//     const isWatchlisted = watchlist.has(c.id);
//     const isCompared = compareList.has(c.id);
//     const partyBadgeClass = getPartyBadgeClass(c.party);

//     return `
//       <div class="candidate-card">
//         <div class="card-top">
//           <div class="card-top-info">
//             <h3>${c.name} ${c.incumbent ? '<span title="Incumbent" style="font-size:0.75rem; color:var(--accent-color);"><i class="fa-solid fa-award"></i></span>' : ''}</h3>
//             <div class="office-title">${c.office}</div>
//             <div class="badges-row">
//               <span class="badge ${partyBadgeClass}">${c.party}</span>
//               <span class="badge badge-level">${c.level}</span>
//             </div>
//           </div>
//           <div class="card-actions-top">
//             <button class="icon-btn ${isWatchlisted ? 'active' : ''}" onclick="toggleWatchlist(${c.id})" title="Bookmark Candidate">
//               <i class="${isWatchlisted ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
//             </button>
//           </div>
//         </div>

//         <div class="card-body">
//           <div class="card-section-title">Key Focus Areas</div>
//           <div class="tag-list">
//             ${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}
//           </div>
//           <p class="bio-snippet">${c.bio}</p>
//         </div>

//         <div class="card-footer">
//           <label class="checkbox-label">
//             <input type="checkbox" ${isCompared ? 'checked' : ''} onchange="toggleCompare(${c.id})">
//             Compare
//           </label>
//           <button class="btn btn-sm btn-outline" onclick="openDetailModal(${c.id})">
//             View Platform <i class="fa-solid fa-arrow-right"></i>
//           </button>
//         </div>
//       </div>
//     `;
//   }).join('');
// }

// // Helpers
// function getPartyBadgeClass(party) {
//   switch (party) {
//     case "Republican": return "badge-rep";
//     case "Democratic": return "badge-dem";
//     case "Libertarian": return "badge-lib";
//     case "Independent": return "badge-ind";
//     default: return "";
//   }
// }

// // Watchlist Actions
// function toggleWatchlist(id) {
//   if (watchlist.has(id)) {
//     watchlist.delete(id);
//   } else {
//     watchlist.add(id);
//   }
//   watchlistCount.textContent = watchlist.size;
//   renderCandidates();
//   renderWatchlistDrawer();
// }

// function renderWatchlistDrawer() {
//   if (watchlist.size === 0) {
//     watchlistBody.innerHTML = `
//       <div class="empty-state">
//         <i class="fa-solid fa-bookmark"></i>
//         <p>No candidates added to watchlist yet.</p>
//       </div>
//     `;
//     return;
//   }

//   const items = Array.from(watchlist).map(id => CANDIDATES.find(c => c.id === id)).filter(Boolean);
//   watchlistBody.innerHTML = items.map(c => `
//     <div class="watchlist-item">
//       <div>
//         <h5>${c.name}</h5>
//         <p>${c.office} (${c.party})</p>
//       </div>
//       <button class="icon-btn" onclick="toggleWatchlist(${c.id})" title="Remove">
//         <i class="fa-solid fa-trash-can"></i>
//       </button>
//     </div>
//   `).join('');
// }

// // Compare Actions
// function toggleCompare(id) {
//   if (compareList.has(id)) {
//     compareList.delete(id);
//   } else {
//     if (compareList.size >= 4) {
//       alert("You can compare up to 4 candidates at a time.");
//       renderCandidates();
//       return;
//     }
//     compareList.add(id);
//   }
//   compareCount.textContent = compareList.size;
//   compareBtn.disabled = compareList.size === 0;
//   renderCandidates();
// }

// function openCompareModal() {
//   if (compareList.size === 0) return;
//   const selected = Array.from(compareList).map(id => CANDIDATES.find(c => c.id === id));

//   compareModalBody.innerHTML = selected.map(c => `
//     <div class="compare-col">
//       <h4>${c.name}</h4>
//       <div class="office">${c.office}</div>
//       <span class="badge ${getPartyBadgeClass(c.party)}">${c.party}</span>
      
//       <div class="compare-section">
//         <h5>Background</h5>
//         <p>${c.bio}</p>
//       </div>

//       <div class="compare-section">
//         <h5>Key Positions</h5>
//         ${c.keyPositions.map(kp => `
//           <p style="margin-bottom:0.4rem;"><strong>${kp.issue}:</strong> ${kp.stance}</p>
//         `).join('')}
//       </div>
//     </div>
//   `).join('');

//   compareModal.classList.remove("hidden");
// }

// // Detail Modal Action
// function openDetailModal(id) {
//   const c = CANDIDATES.find(cand => cand.id === id);
//   if (!c) return;

//   detailModalBody.innerHTML = `
//     <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
//       <div>
//         <h2 style="font-size:1.5rem; margin-bottom:0.2rem;">${c.name}</h2>
//         <div style="color:var(--primary-color); font-weight:600;">${c.office}</div>
//       </div>
//       <span class="badge ${getPartyBadgeClass(c.party)}" style="font-size:0.85rem;">${c.party}</span>
//     </div>

//     <p style="margin-bottom:1.25rem; color:var(--text-muted); line-height:1.6;">${c.bio}</p>

//     <h4 style="font-size:1rem; margin-bottom:0.75rem; color:var(--text-primary); border-bottom:1px solid var(--border-color); padding-bottom:0.4rem;">
//       <i class="fa-solid fa-list-check"></i> Key Policy Positions
//     </h4>

//     <div style="display:flex; flex-direction:column; gap:0.85rem; margin-bottom:1.5rem;">
//       ${c.keyPositions.map(kp => `
//         <div style="background-color:#f8fafc; padding:0.85rem; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
//           <div style="font-weight:700; font-size:0.85rem; color:var(--primary-color); text-transform:uppercase; margin-bottom:0.2rem;">${kp.issue}</div>
//           <div style="font-size:0.9rem;">${kp.stance}</div>
//         </div>
//       `).join('')}
//     </div>

//     <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--border-color);">
//       <a href="${c.website}" target="_blank" rel="noopener" class="btn btn-primary">
//         Official Campaign Site <i class="fa-solid fa-arrow-up-right-from-square"></i>
//       </a>
//       <button class="btn btn-outline" onclick="toggleWatchlist(${c.id})">
//         <i class="fa-solid fa-bookmark"></i> ${watchlist.has(c.id) ? 'Saved' : 'Save Candidate'}
//       </button>
//     </div>
//   `;

//   detailModal.classList.remove("hidden");
// }
