import React, { useState, useMemo } from 'react';
import { 
  Search, MapPin, Bookmark, BookmarkCheck, Scale, X, ExternalLink, 
  Sun, Moon, Filter, CheckCircle2, Building2, Landmark, UserCheck, 
  HelpCircle, ChevronRight, Info, AlertCircle, Share2, Compass, Shield
} from 'lucide-react';

// Sample Elections & Candidates Data pre-populated for Fishers, Hamilton County, IN
const INITIAL_CANDIDATES = [
  // FEDERAL LEVEL
  {
    id: 'fed-1',
    name: 'Victoria Spartz',
    party: 'Republican',
    office: 'U.S. House of Representatives',
    district: 'Indiana 5th Congressional District',
    level: 'Federal',
    status: 'Incumbent Running for Re-election',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    bio: 'Business owner, CPA, and current U.S. Representative focusing on fiscal responsibility, free markets, border security, and healthcare transparency.',
    keyFocus: ['Fiscal Responsibility', 'Border Security', 'Healthcare Transparency', 'Agricultural Growth'],
    website: 'https://spartz.house.gov',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'Taxes & Economy': 'Supports lowering corporate tax rates, reducing federal regulation, and spending caps.',
      'Healthcare': 'Promotes free-market healthcare reform, price transparency, and expanded HSAs.',
      'Infrastructure': 'Prioritizes targeted infrastructure grants with strict local control.'
    }
  },
  {
    id: 'fed-2',
    name: 'J.D. Ford',
    party: 'Democratic',
    office: 'U.S. House of Representatives',
    district: 'Indiana 5th Congressional District',
    level: 'Federal',
    status: 'Challenger',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
    bio: 'State Senator and community advocate championing public education funding, accessible healthcare, middle-class tax relief, and civil rights protections.',
    keyFocus: ['Public Education Funding', 'Accessible Healthcare', 'Worker Rights', 'Environmental Protection'],
    website: 'https://jdfordforindiana.com',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'Taxes & Economy': 'Advocates tax relief for working families and incentives for green tech manufacturing.',
      'Healthcare': 'Supports expanding Medicaid, capping prescription drug costs, and protecting reproductive care.',
      'Infrastructure': 'Supports federal investments in public transit, clean water, and renewable energy grids.'
    }
  },

  // STATE LEVEL
  {
    id: 'state-1',
    name: 'Beau Bayh',
    party: 'Democratic',
    office: 'Indiana Secretary of State',
    district: 'Statewide',
    level: 'State',
    status: 'Candidate',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    bio: 'Attorney and civic leader focusing on election modernizations, expanding voter access, streamlining business registrations, and protecting civic institutions.',
    keyFocus: ['Voter Access Modernization', 'Small Business Licensing Efficiency', 'Cybersecurity in Elections'],
    website: 'https://bayhforindiana.com',
    voterGuideUrl: 'https://indianavoters.in.gov',
    stanceHighlights: {
      'Election Integrity': 'Advocates automatic voter registration, secure mail-in options, and enhanced audit standards.',
      'Business Services': 'Pledges to modernize INBiz web platform to cut red tape for small businesses.'
    }
  },
  {
    id: 'state-2',
    name: 'Max Engling',
    party: 'Republican',
    office: 'Indiana Secretary of State',
    district: 'Statewide',
    level: 'State',
    status: 'Candidate',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    bio: 'Former congressional policy strategist focused on strict voter ID enforcement, election security audits, and business growth transparency.',
    keyFocus: ['Strict Voter ID Laws', 'Election Audit Verification', 'Anti-Fraud Standards'],
    website: 'https://maxengling.com',
    voterGuideUrl: 'https://indianavoters.in.gov',
    stanceHighlights: {
      'Election Integrity': 'Emphasizes strict voter list maintenance, photo ID checks, and paper-trail auditing.',
      'Business Services': 'Focuses on reducing fee structures for new state corporate entity filings.'
    }
  },
  {
    id: 'state-3',
    name: 'Lauri Shillings',
    party: 'Libertarian',
    office: 'Indiana Secretary of State',
    district: 'Statewide',
    level: 'State',
    status: 'Candidate',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    bio: 'Consumer advocate aiming to decentralize election systems, remove ballot access barriers for independent candidates, and deregulate state licensing.',
    keyFocus: ['Ballot Access Reform', 'Deregulation', 'Government Transparency'],
    website: 'https://lpin.org',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'Election Integrity': 'Focuses on opening ballot access to third-party candidates and ending single-party redistricting.',
      'Business Services': 'Proposes eliminating unnecessary occupational licensing fees.'
    }
  },
  {
    id: 'state-4',
    name: 'Greg Ballard',
    party: 'Independent',
    office: 'Indiana Secretary of State',
    district: 'Statewide',
    level: 'State',
    status: 'Independent Candidate',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    bio: 'Former Mayor and USMC veteran advocating for nonpartisan election administration, redistricting reform, and civic trust restoration.',
    keyFocus: ['Nonpartisan Election Oversight', 'Independent Redistricting', 'Civic Engagement'],
    website: 'https://ballardforindiana.org',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'Election Integrity': 'Pushes for open primaries and an independent nonpartisan commission for voter districts.',
      'Business Services': 'Promotes public-private partnerships for digital government services.'
    }
  },
  {
    id: 'state-5',
    name: 'Elise Nieshalla',
    party: 'Republican',
    office: 'Indiana State Comptroller',
    district: 'Statewide',
    level: 'State',
    status: 'Incumbent',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    bio: 'Financial leader and former county council member focusing on state budget accountability, government spending transparency, and taxpayers protections.',
    keyFocus: ['Fiscal Oversight', 'Auditing Government Spending', 'Taxpayer Value'],
    website: 'https://in.gov/comptroller',
    voterGuideUrl: 'https://indianavoters.in.gov',
    stanceHighlights: {
      'Fiscal Policy': 'Ensures transparent state payroll, strict auditing of state vendor contracts, and conservative budgeting.'
    }
  },
  {
    id: 'state-6',
    name: 'Jessica Bailey',
    party: 'Democratic',
    office: 'Indiana State Comptroller',
    district: 'Statewide',
    level: 'State',
    status: 'Challenger',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400&auto=format&fit=crop&q=80',
    bio: 'Certified Financial Planner advocating for accessible online spending dashboards, ethical investment of state reserves, and wage accountability.',
    keyFocus: ['Open Data Dashboards', 'Ethical State Pension Investing', 'Labor Rights Oversight'],
    website: 'https://baileyforindiana.com',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'Fiscal Policy': 'Pledges real-time online tracking of state subsidies awarded to major corporations.'
    }
  },

  // COUNTY LEVEL (Hamilton County)
  {
    id: 'county-1',
    name: 'Christine Altman',
    party: 'Republican',
    office: 'Hamilton County Commissioner',
    district: 'District 3',
    level: 'County',
    status: 'Incumbent',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80',
    bio: 'Longtime commissioner leading regional infrastructure development, emergency services coordination, and county park system expansion.',
    keyFocus: ['Road & Bridge Expansion', 'Mental Health Initiatives', 'County Park Trails'],
    website: 'https://hamiltoncounty.in.gov',
    voterGuideUrl: 'https://hamiltoncounty.in.gov/elections',
    stanceHighlights: {
      'County Infrastructure': 'Spearheading SR-37 improvements and countywide trail connectivity.',
      'Public Safety': 'Expanding funding for county sheriff responders and dispatch tech.'
    }
  },
  {
    id: 'county-2',
    name: 'Mark Heirbrandt',
    party: 'Republican',
    office: 'Hamilton County Commissioner',
    district: 'District 2',
    level: 'County',
    status: 'Incumbent',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    bio: 'Business administrator prioritizing efficient county government operation, storm drainage solutions, and sustainable growth management.',
    keyFocus: ['Drainage & Flood Control', 'Commercial Tax Base Growth', 'Public Safety Support'],
    website: 'https://hamiltoncounty.in.gov',
    voterGuideUrl: 'https://hamiltoncounty.in.gov/elections',
    stanceHighlights: {
      'County Infrastructure': 'Focused on modernizing aging county bridges and stormwater facilities.'
    }
  },
  {
    id: 'county-3',
    name: 'Stephanie G. Gilliard',
    party: 'Democratic',
    office: 'Hamilton County Council',
    district: 'At-Large',
    level: 'County',
    status: 'Candidate',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&auto=format&fit=crop&q=80',
    bio: 'Community organizer advocating for balanced county growth, affordable housing policy incentives, and expanded mental health diversion programs.',
    keyFocus: ['Affordable Housing Incentives', 'Mental Health Services', 'Budget Transparency'],
    website: 'https://hamcodems.org',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'County Infrastructure': 'Advocates for balanced growth that protects green spaces and encourages workforce housing.'
    }
  },

  // MUNICIPAL / CITY LEVEL (Fishers)
  {
    id: 'city-1',
    name: 'Scott Fadness',
    party: 'Republican',
    office: 'Mayor of Fishers',
    district: 'City-wide',
    level: 'City / Municipal',
    status: 'Incumbent',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    bio: 'Serving as Mayor during Fishers transition from town to city. Focuses on tech hub economic development, downtown redevelopment (Fishers District), and top-tier parks.',
    keyFocus: ['Tech & Life Sciences Job Creation', 'Downtown Density & District', 'Smart City Infrastructure'],
    website: 'https://fishers.in.us',
    voterGuideUrl: 'https://fishers.in.us/elections',
    stanceHighlights: {
      'Economic Development': 'Attracting life-sciences and entrepreneurship hubs to Fishers life science park.',
      'Public Safety': 'Supporting Fishers Police Department zero-trust security and mental health response teams.'
    }
  },
  {
    id: 'city-2',
    name: 'Jocelyn Vare',
    party: 'Democratic',
    office: 'Fishers City Council',
    district: 'At-Large',
    level: 'City / Municipal',
    status: 'Incumbent Councilmember',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    bio: 'Small business owner and City Council member emphasizing community input in development decisions, transparency, walkable neighborhood trails, and environmental stewardship.',
    keyFocus: ['Community Transparency', 'Pedestrian & Bike Connectivity', 'Environmental Sustainability'],
    website: 'https://jocelynvareforfishers.com',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'Economic Development': 'Advocates for responsible commercial growth while protecting residential character.',
      'Transparency': 'Proposes frequent neighborhood town halls and accessible city expenditure records.'
    }
  },
  {
    id: 'city-3',
    name: 'Todd Zimmerman',
    party: 'Republican',
    office: 'Fishers City Council',
    district: 'At-Large',
    level: 'City / Municipal',
    status: 'Incumbent Councilmember',
    electionDate: 'Nov 3, 2026',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    bio: 'Chaplain and council leader focused on low municipal tax rates, strong public safety support, high quality of life amenities, and park development.',
    keyFocus: ['Low Municipal Property Tax', 'Public Safety Funding', 'Parks & Recreation'],
    website: 'https://fishers.in.us',
    voterGuideUrl: 'https://vote411.org',
    stanceHighlights: {
      'Economic Development': 'Maintains competitive commercial tax incentives to attract national headquarters.',
      'Public Safety': 'Ensures competitive salaries for Fishers firefighters and police staff.'
    }
  }
];

export default function App() {
  const [theme, setTheme] = useState('light');
  const [selectedLocation, setSelectedLocation] = useState('Fishers, Hamilton County, IN');
  const [activeLevelTab, setActiveLevelTab] = useState('All'); // All, Federal, State, County, City / Municipal
  const [selectedParty, setSelectedParty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive features states
  const [bookmarkedIds, setBookmarkedIds] = useState(['fed-1', 'city-1']);
  const [comparisonList, setComparisonList] = useState([]);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState(null);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Toggle Dark / Light mode
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Toggle bookmark / watchlist status
  const toggleBookmark = (id) => {
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Add or remove from comparison list (max 2 candidates)
  const toggleCompare = (candidate) => {
    if (comparisonList.some(c => c.id === candidate.id)) {
      setComparisonList(prev => prev.filter(c => c.id !== candidate.id));
    } else {
      if (comparisonList.length >= 2) {
        // replace the second one
        setComparisonList([comparisonList[0], candidate]);
      } else {
        setComparisonList(prev => [...prev, candidate]);
      }
    }
  };

  // Filter candidates logic
  const filteredCandidates = useMemo(() => {
    return INITIAL_CANDIDATES.filter(c => {
      // Level tab filter
      if (activeLevelTab !== 'All' && c.level !== activeLevelTab) {
        return false;
      }
      // Party filter
      if (selectedParty !== 'All' && c.party !== selectedParty) {
        return false;
      }
      // Watchlist filter
      if (showWatchlistOnly && !bookmarkedIds.includes(c.id)) {
        return false;
      }
      // Search Query filter (matches candidate name, office, or key focus areas)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesOffice = c.office.toLowerCase().includes(query);
        const matchesDistrict = c.district.toLowerCase().includes(query);
        const matchesFocus = c.keyFocus.some(k => k.toLowerCase().includes(query));
        return matchesName || matchesOffice || matchesDistrict || matchesFocus;
      }
      return true;
    });
  }, [activeLevelTab, selectedParty, searchQuery, showWatchlistOnly, bookmarkedIds]);

  // Color helper for party badges
  const getPartyBadgeColor = (party) => {
    switch(party) {
      case 'Republican':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'Democratic':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Libertarian':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'Independent':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className={`${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} min-h-screen transition-colors duration-200 font-sans`}>
      
      {/* TOP HEADER / NAVBAR */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Branding */}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                  VoterGuide IN
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Hamilton County & Indiana Elections Hub</p>
              </div>
            </div>

            {/* Location Selector Display */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs">
              <MapPin className="w-4 h-4 text-indigo-500 mr-1.5" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Registered Location:</span>
              <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-medium">{selectedLocation}</span>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              
              {/* Watchlist Quick Toggle */}
              <button
                onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  showWatchlistOnly 
                    ? 'bg-amber-500 text-white shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Bookmark className="w-4 h-4 fill-current" />
                <span>Watchlist</span>
                <span className="ml-1 px-1.5 py-0.2 bg-white/30 dark:bg-slate-900/40 rounded-full text-[10px]">
                  {bookmarkedIds.length}
                </span>
              </button>

              {/* Compare Bar Toggle */}
              {comparisonList.length > 0 && (
                <button
                  onClick={() => setShowCompareModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all animate-pulse"
                >
                  <Scale className="w-4 h-4" />
                  <span>Compare ({comparisonList.length}/2)</span>
                </button>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO SECTION WITH LOCATION SIMULATOR & SEARCH */}
      <section className="bg-gradient-to-b from-indigo-50/70 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 py-8 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>2026 Indiana General Election Candidate Directory</span>
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Who is on your ballot in <span className="text-indigo-600 dark:text-indigo-400">Fishers, IN</span>?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Explore candidates running at Federal, State, Hamilton County, and City levels. Compare platforms, save key candidates, and find nonpartisan voting guides.
          </p>

          {/* LOCATION SIMULATOR BAR */}
          <div className="mt-6 max-w-3xl mx-auto bg-white dark:bg-slate-900 p-2 sm:p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <MapPin className="w-4 h-4 text-indigo-500 mr-2 shrink-0" />
              <input
                type="text"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                placeholder="Enter City, County or Zip Code..."
                className="w-full text-xs sm:text-sm bg-transparent focus:outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Quick Location Preset Buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-center">
              <span className="text-[11px] text-slate-400 font-medium hidden lg:inline">Simulate:</span>
              <button 
                onClick={() => setSelectedLocation('Fishers, Hamilton County, IN')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
              >
                Fishers
              </button>
              <button 
                onClick={() => setSelectedLocation('Noblesville, Hamilton County, IN')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Noblesville
              </button>
              <button 
                onClick={() => setSelectedLocation('Carmel, Hamilton County, IN')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Carmel
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* CONTROLS: SEARCH & PARTY FILTERS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by candidate name, office, or policy issue (e.g. Taxes, Health)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm text-slate-800 dark:text-slate-200"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Party Affiliation Filter Buttons */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center">
              <Filter className="w-3 h-3 mr-1" /> Party:
            </span>
            {['All', 'Republican', 'Democratic', 'Libertarian', 'Independent'].map(party => (
              <button
                key={party}
                onClick={() => setSelectedParty(party)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                  selectedParty === party
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {party}
              </button>
            ))}
          </div>
        </div>

        {/* GOVERNMENT LEVEL TABS */}
        <div className="border-b border-slate-200 dark:border-slate-800 mb-8">
          <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-none">
            {[
              { label: 'All Levels', value: 'All', count: INITIAL_CANDIDATES.length },
              { label: 'Federal', value: 'Federal', count: INITIAL_CANDIDATES.filter(c => c.level === 'Federal').length },
              { label: 'State', value: 'State', count: INITIAL_CANDIDATES.filter(c => c.level === 'State').length },
              { label: 'Hamilton County', value: 'County', count: INITIAL_CANDIDATES.filter(c => c.level === 'County').length },
              { label: 'Fishers / Municipal', value: 'City / Municipal', count: INITIAL_CANDIDATES.filter(c => c.level === 'City / Municipal').length },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveLevelTab(tab.value)}
                className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all ${
                  activeLevelTab === tab.value
                    ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeLevelTab === tab.value 
                    ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* ACTIVE FILTER DISCLOSURE & WATCHLIST NOTICE */}
        {showWatchlistOnly && (
          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center space-x-2">
              <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>Showing saved candidate watchlist only ({filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}).</span>
            </div>
            <button 
              onClick={() => setShowWatchlistOnly(false)}
              className="underline font-semibold hover:text-amber-900"
            >
              Show all candidates
            </button>
          </div>
        )}

        {/* CANDIDATE CARDS GRID */}
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Candidates Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your party filter, search query, or switching tabs.
            </p>
            <button
              onClick={() => {
                setSelectedParty('All');
                setSearchQuery('');
                setActiveLevelTab('All');
                setShowWatchlistOnly(false);
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map(candidate => {
              const isBookmarked = bookmarkedIds.includes(candidate.id);
              const isComparing = comparisonList.some(c => c.id === candidate.id);

              return (
                <div
                  key={candidate.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Card Header Top */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Image & Main Info */}
                      <div className="flex items-center space-x-3">
                        <img
                          src={candidate.photo}
                          alt={candidate.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm group-hover:scale-105 transition-transform"
                        />
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                            {candidate.name}
                          </h3>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {candidate.office}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {candidate.district}
                          </p>
                        </div>
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={() => toggleBookmark(candidate.id)}
                        title={isBookmarked ? "Remove from watchlist" : "Save to watchlist"}
                        className={`p-2 rounded-xl transition ${
                          isBookmarked 
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="w-4 h-4 fill-amber-500" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Party & Level Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getPartyBadgeColor(candidate.party)}`}>
                        {candidate.party}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {candidate.level}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-auto italic">
                        {candidate.status}
                      </span>
                    </div>

                    {/* Bio Snippet */}
                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {candidate.bio}
                    </p>

                    {/* Focus Tag Badges */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Key Policy Priorities
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.keyFocus.map((focus, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium"
                          >
                            {focus}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    
                    {/* Comparison Button */}
                    <button
                      onClick={() => toggleCompare(candidate)}
                      className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        isComparing 
                          ? 'bg-indigo-600 text-white font-semibold' 
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>{isComparing ? 'Comparing' : 'Compare'}</span>
                    </button>

                    {/* Full Platform / Bio Modal Opener */}
                    <button
                      onClick={() => setSelectedCandidateDetail(candidate)}
                      className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      <span>View Platform</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* OFFICIAL ELECTION INFORMATION PANEL */}
        <section className="mt-14 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="max-w-4xl">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <UserCheck className="w-4 h-4" />
              <span>Voter Resources & Official Tools</span>
            </div>
            <h3 className="text-xl sm:text-3xl font-bold tracking-tight">
              Ready to vote in Fishers & Hamilton County?
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Check your voter registration status, locate early voting sites in Noblesville or Fishers, or review official nonpartisan state voter guides before heading to the polls.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Tool 1 */}
              <a
                href="https://indianavoters.in.gov"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 w-fit mb-3">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition">
                    Indiana Voters Portal
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Verify registration, request absentee ballot, or check sample ballots.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Go to IndianaVoters.in.gov</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </div>
              </a>

              {/* Tool 2 */}
              <a
                href="https://hamiltoncounty.in.gov/elections"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 w-fit mb-3">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                    Hamilton County Election Office
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Find early voting locations in Fishers, polling hours, and local candidate filings.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Visit County Election Hub</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </div>
              </a>

              {/* Tool 3 */}
              <a
                href="https://www.vote411.org"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 w-fit mb-3">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition">
                    Vote411 Nonpartisan Guide
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Powered by the League of Women Voters for unbiased policy Q&As.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Launch Vote411</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </div>
              </a>

            </div>
          </div>
        </section>
      </main>

      {/* CANDIDATE DETAIL MODAL */}
      {selectedCandidateDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={selectedCandidateDetail.photo}
                  alt={selectedCandidateDetail.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shadow"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedCandidateDetail.name}
                    </h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPartyBadgeColor(selectedCandidateDetail.party)}`}>
                      {selectedCandidateDetail.party}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedCandidateDetail.office} — {selectedCandidateDetail.district}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidateDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-6 space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
              
              {/* Bio */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                  Biography & Background
                </h4>
                <p className="leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  {selectedCandidateDetail.bio}
                </p>
              </div>

              {/* Policy Stance Breakdown */}
              {selectedCandidateDetail.stanceHighlights && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                    Policy Stances & Positions
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(selectedCandidateDetail.stanceHighlights).map(([topic, stance], i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-0.5">
                          {topic}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                          {stance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links & Information Sources */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                  Official Links & Nonpartisan Resources
                </h4>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={selectedCandidateDetail.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-xs hover:bg-indigo-700 transition"
                  >
                    <span>Campaign Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={selectedCandidateDetail.voterGuideUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <span>Nonpartisan Voter Guide</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SIDE-BY-SIDE CANDIDATE COMPARISON MODAL */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Side-by-Side Candidate Comparison
                </h2>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Grid */}
            {comparisonList.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Select at least one candidate to compare.</p>
            ) : (
              <div className={`grid grid-cols-1 ${comparisonList.length === 2 ? 'md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
                {comparisonList.map((cand) => (
                  <div key={cand.id} className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 relative flex flex-col justify-between">
                    
                    <div>
                      {/* Top Remove Button */}
                      <button
                        onClick={() => toggleCompare(cand)}
                        className="absolute top-4 right-4 p-1 text-slate-400 hover:text-red-500"
                        title="Remove from comparison"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Info */}
                      <div className="flex items-center space-x-3 mb-4">
                        <img src={cand.photo} alt={cand.name} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">{cand.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPartyBadgeColor(cand.party)}`}>
                            {cand.party}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="font-semibold text-slate-400 block">Office & Level:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">{cand.office} ({cand.level})</span>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-400 block">Key Priorities:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cand.keyFocus.map((f, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[10px]">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-400 block">Bio Summary:</span>
                          <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{cand.bio}</p>
                        </div>

                        {cand.stanceHighlights && (
                          <div>
                            <span className="font-semibold text-slate-400 block mb-1">Stances Highlights:</span>
                            {Object.entries(cand.stanceHighlights).map(([t, s], i) => (
                              <div key={i} className="mb-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 block">{t}</span>
                                <span className="text-slate-600 dark:text-slate-300 text-[11px]">{s}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <a
                        href={cand.website}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex justify-center items-center space-x-1 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-xs hover:bg-indigo-700 transition"
                      >
                        <span>Visit Website</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 VoterGuide IN. Nonpartisan election resource tailored for Hamilton County & Indiana voters.</p>
          <div className="flex space-x-4">
            <a href="https://indianavoters.in.gov" target="_blank" rel="noreferrer" className="hover:underline">Voter Registration</a>
            <a href="https://hamiltoncounty.in.gov/elections" target="_blank" rel="noreferrer" className="hover:underline">County Election Office</a>
            <a href="https://vote411.org" target="_blank" rel="noreferrer" className="hover:underline">Vote411</a>
          </div>
        </div>
      </footer>
    </div>
  );
}