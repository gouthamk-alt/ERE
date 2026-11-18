import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import {
  Search,
  Phone,
  Mail,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Menu,
  X,
  Bed,
  Bath,
  Car,
  ArrowUpRight,
  MapPin,
  ArrowLeft,
  Calendar,
  User,
} from 'lucide-react';
import {
  INITIAL_TEAM_MEMBERS,
  INITIAL_ENQUIRIES,
  BRAND_ASSETS,
  PropertyListing,
  ListingCategory,
  TeamMember,
  ClientEnquiry,
  BlogPost,
} from './data/initialData';
import { PropertyImage } from './components/PropertyImage';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { TeamMemberProfile } from './components/TeamMemberProfile';
import { AdminAccess } from './components/AdminAccess';
import { useWebsiteContent } from './useWebsiteContent';
import { usePageMotion } from './usePageMotion';

const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));

type ActivePage =
  | 'home'
  | 'listings'
  | 'list-with-us'
  | 'team'
  | 'team-profile'
  | 'videos'
  | 'blog';

const STORAGE_KEY_ENQUIRIES = 'exceptional_re_zenu_enquiries_v3';

export default function App() {
  const { listings, blogPosts, ready: contentReady, error: contentError, saving, refresh: refreshContent, save: saveContent, browserEdits, importBrowserEdits } = useWebsiteContent();

  const [enquiries, setEnquiries] = useState<ClientEnquiry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ENQUIRIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return INITIAL_ENQUIRIES;
  });

  const [teamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  usePageMotion(activePage, contentReady);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Home page listings minimise / expand state (shows 3 listings by default)
  const [showAllHomeListings, setShowAllHomeListings] = useState(false);

  // Blog page selected article & category filter
  const [selectedBlogPostId, setSelectedBlogPostId] = useState<string | null>(null);
  const [blogCategoryFilter, setBlogCategoryFilter] = useState<string>('ALL');

  // Search & Filter States
  const [heroSaleMethod, setHeroSaleMethod] = useState<'Buy' | 'Lease' | 'Sold'>('Buy');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ListingCategory>('ALL');
  const [searchSuburb, setSearchSuburb] = useState('');
  const [minBeds, setMinBeds] = useState<number>(0);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('ALL');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('ALL');
  const [showAdvancedHeroFilters, setShowAdvancedHeroFilters] = useState(false);

  // Property Detail Modal
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);

  // Appraisal Form State
  const [appraisalForm, setAppraisalForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    propertyAddress: '',
    serviceInterest: 'Sell with us — Free Sales Appraisal',
    preferredAgent: 'Wendy Chia (Director & Licensee, Licence No. RA84388)',
    notes: '',
  });
  const [appraisalSubmitted, setAppraisalSubmitted] = useState(false);
  const [appraisalError, setAppraisalError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ENQUIRIES, JSON.stringify(enquiries));
    } catch {
      // ignore
    }
  }, [enquiries]);

  const navigateTo = (page: ActivePage, categoryPreset?: 'ALL' | ListingCategory) => {
    if (categoryPreset) {
      setSelectedCategory(categoryPreset);
    }
    if (page !== 'blog') {
      setSelectedBlogPostId(null);
    }
    setActivePage(page);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.page-content')?.focus({ preventScroll: true }));
  };

  const openBlogPost = (id: string) => {
    setSelectedBlogPostId(id);
    navigateTo('blog');
  };

  const openTeamMember = (id: string) => {
    setSelectedTeamMemberId(id);
    navigateTo('team-profile');
  };
  const selectedTeamMember = teamMembers.find((member) => member.id === selectedTeamMemberId);

  // Publish only after the server confirms a durable save.
  const handleAddListing = (item: PropertyListing) => saveContent({ collection: 'listings', action: 'add', item });
  const handleUpdateListing = async (item: PropertyListing) => {
    const saved = await saveContent({ collection: 'listings', action: 'update', item });
    if (saved && selectedProperty?.id === item.id) setSelectedProperty(item);
    return saved;
  };
  const handleDeleteListing = async (id: string) => {
    const saved = await saveContent({ collection: 'listings', action: 'delete', id });
    if (saved && selectedProperty?.id === id) setSelectedProperty(null);
    return saved;
  };
  const handleAddBlogPost = (item: BlogPost) => saveContent({ collection: 'blogPosts', action: 'add', item });
  const handleUpdateBlogPost = (item: BlogPost) => saveContent({ collection: 'blogPosts', action: 'update', item });
  const handleDeleteBlogPost = async (id: string) => {
    const saved = await saveContent({ collection: 'blogPosts', action: 'delete', id });
    if (saved && selectedBlogPostId === id) setSelectedBlogPostId(null);
    return saved;
  };

  const handleAddEnquiry = (data: {
    type: ClientEnquiry['type'];
    clientName: string;
    email: string;
    phone: string;
    propertyTitle?: string;
    propertyId?: string;
    suburbOrAddress?: string;
    message: string;
  }) => {
    const newEntry: ClientEnquiry = {
      id: `enq-${Date.now().toString().slice(-4)}`,
      type: data.type,
      clientName: data.clientName,
      email: data.email,
      phone: data.phone,
      propertyTitle: data.propertyTitle,
      propertyId: data.propertyId,
      suburbOrAddress: data.suburbOrAddress,
      message: data.message,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'New',
    };
    setEnquiries((prev) => [newEntry, ...prev]);
  };

  const handleUpdateEnquiryStatus = (id: string, status: ClientEnquiry['status']) => {
    setEnquiries((prev) =>
      prev.map((enq) => (enq.id === id ? { ...enq, status } : enq))
    );
  };

  const handleAppraisalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !appraisalForm.fullName.trim() ||
      !appraisalForm.email.trim() ||
      !appraisalForm.phone.trim() ||
      !appraisalForm.propertyAddress.trim()
    ) {
      setAppraisalError('Please fill in your Full Name, Phone, Email, and Property Address.');
      return;
    }
    if (!appraisalForm.email.includes('@')) {
      setAppraisalError('Please provide a valid email address.');
      return;
    }

    handleAddEnquiry({
      type: 'Free Appraisal',
      clientName: appraisalForm.fullName.trim(),
      email: appraisalForm.email.trim(),
      phone: appraisalForm.phone.trim(),
      suburbOrAddress: appraisalForm.propertyAddress.trim(),
      message: `[${appraisalForm.serviceInterest} · ${appraisalForm.preferredAgent}] ${appraisalForm.notes.trim() || 'Appraisal requested via website.'}`,
    });

    setAppraisalSubmitted(true);
    setAppraisalError('');
  };

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (
        searchSuburb.trim() &&
        !item.suburb.toLowerCase().includes(searchSuburb.toLowerCase()) &&
        !item.address.toLowerCase().includes(searchSuburb.toLowerCase()) &&
        !item.title.toLowerCase().includes(searchSuburb.toLowerCase()) &&
        !item.postcode.includes(searchSuburb.trim())
      ) {
        return false;
      }
      if (minBeds > 0 && item.bedrooms < minBeds) {
        return false;
      }
      if (propertyTypeFilter !== 'ALL' && item.propertyType !== propertyTypeFilter) {
        return false;
      }
      if (
        selectedAgentFilter !== 'ALL' &&
        item.agentId !== selectedAgentFilter &&
        item.coAgentId !== selectedAgentFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    listings,
    selectedCategory,
    searchSuburb,
    minBeds,
    propertyTypeFilter,
    selectedAgentFilter,
  ]);

  const homeDisplayedListings = useMemo(() => {
    return showAllHomeListings ? filteredListings : filteredListings.slice(0, 3);
  }, [filteredListings, showAllHomeListings]);

  const commercialListings = useMemo(
    () => listings.filter((l) => l.category === 'Commercial' || l.id === '2997890'),
    [listings]
  );

  const blogCategories = useMemo(() => {
    const cats = Array.from(new Set(blogPosts.map((b) => b.category)));
    return ['ALL', ...cats];
  }, [blogPosts]);

  const filteredBlogs = useMemo(() => {
    if (blogCategoryFilter === 'ALL') return blogPosts;
    return blogPosts.filter((b) => b.category === blogCategoryFilter);
  }, [blogPosts, blogCategoryFilter]);

  const activeBlogPost = useMemo(() => {
    if (!selectedBlogPostId) return null;
    return blogPosts.find((b) => b.id === selectedBlogPostId) || null;
  }, [blogPosts, selectedBlogPostId]);

  const latestBlogHighlight = blogPosts[0];

  if (/^\/admin\/?$/.test(window.location.pathname)) {
    return (
      <AdminAccess>{(logout) => <Suspense fallback={<p role="status">Loading dashboard…</p>}><>
        <AdminDashboard
          listings={listings}
          teamMembers={teamMembers}
          enquiries={enquiries}
          blogPosts={blogPosts}
          onAddListing={handleAddListing}
          onUpdateListing={handleUpdateListing}
          onDeleteListing={handleDeleteListing}
          onAddBlogPost={handleAddBlogPost}
          onUpdateBlogPost={handleUpdateBlogPost}
          onDeleteBlogPost={handleDeleteBlogPost}
          onUpdateEnquiryStatus={handleUpdateEnquiryStatus}
          onRefreshContent={refreshContent}
          contentReady={contentReady}
          contentError={contentError}
          saving={saving}
          browserEdits={browserEdits}
          onImportBrowserEdits={importBrowserEdits}
          onPreviewProperty={(prop) => setSelectedProperty(prop)}
          onExitAdmin={() => window.location.assign('/')}
          onLogout={logout}
        />
        <PropertyDetailModal
          property={selectedProperty}
          agents={teamMembers}
          onClose={() => setSelectedProperty(null)}
          onSubmitEnquiry={handleAddEnquiry}
        />
      </></Suspense>}</AdminAccess>
    );
  }

  if (!contentReady) return (
    <main className="min-h-screen bg-[#141414] text-white grid place-items-center px-6 text-center">
      <div><h1 className="font-cormorant text-3xl mb-4">Exceptional Real Estate</h1>
        <p role={contentError ? 'alert' : 'status'}>{contentError || 'Loading properties and articles…'}</p>
        {contentError && <button onClick={() => void refreshContent()} className="zenu-button mt-5">Try again</button>}
      </div>
    </main>
  );

  return (
    <div className="public-site min-h-screen flex flex-col bg-[#141414] text-white font-inter">
      {/* =================================================================== */}
      {/* ARCHITECTURAL HEADER (Gradient-to-Black Glass Bar)                  */}
      {/* =================================================================== */}
      {contentError && <div role="alert" className="bg-[#302f2f] px-6 py-3 text-sm">Unable to refresh website content. <button className="underline" onClick={() => void refreshContent()}>Try again</button></div>}
      <header className="sticky top-0 z-40 h-20 bg-[#141414]/95 backdrop-blur-md text-white px-6 lg:px-12">
        <div className="max-w-[1320px] h-full mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: Original Exceptional Real Estate Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            className="flex items-center h-full py-3 shrink-0"
          >
            <img
              src={BRAND_ASSETS.logoLightOnDark}
              alt="Exceptional Real Estate"
              referrerPolicy="no-referrer"
              className="brand-logo h-11 sm:h-12 w-auto object-contain"
            />
          </a>

          {/* Zone 2: Clean Centered Navigation Links with Subtle Dropdowns */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-inter font-light">
            {/* Buy Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('buy')}
              onFocus={() => setOpenDropdown('buy')}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenDropdown(null); }}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('listings', 'Residential Sale')}
                className="flex items-center gap-1.5 py-2 text-white/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Buy</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {openDropdown === 'buy' && (
                <div className="absolute left-0 top-full w-56 bg-[#202020] border border-white/15 py-2 shadow-2xl z-50">
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Residential Sale')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Residential for sale
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Sold')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Residential sold
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Commercial')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Commercial
                  </button>
                </div>
              )}
            </div>

            {/* Lease Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('lease')}
              onFocus={() => setOpenDropdown('lease')}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenDropdown(null); }}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('listings', 'Residential Lease')}
                className="flex items-center gap-1.5 py-2 text-white/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Lease</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {openDropdown === 'lease' && (
                <div className="absolute left-0 top-full w-56 bg-[#202020] border border-white/15 py-2 shadow-2xl z-50">
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Residential Lease')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Residential for lease
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Commercial')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Commercial for lease
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Leased')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Residential leased
                  </button>
                </div>
              )}
            </div>

            {/* List with us */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('list')}
              onFocus={() => setOpenDropdown('list')}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenDropdown(null); }}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('list-with-us')}
                className="flex items-center gap-1.5 py-2 text-white/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>List with us</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {openDropdown === 'list' && (
                <div className="absolute left-0 top-full w-52 bg-[#202020] border border-white/15 py-2 shadow-2xl z-50">
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Sell with us
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Lease with us
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Build with us
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateTo('team')}
              className={`py-2 transition-colors cursor-pointer whitespace-nowrap ${
                activePage === 'team' || activePage === 'team-profile' ? 'text-white font-medium' : 'text-white/90 hover:text-white'
              }`}
            >
              Team
            </button>

            <button
              type="button"
              onClick={() => navigateTo('videos')}
              className={`py-2 transition-colors cursor-pointer whitespace-nowrap ${
                activePage === 'videos' ? 'text-white font-medium' : 'text-white/90 hover:text-white'
              }`}
            >
              Property videos
            </button>

            <button
              type="button"
              onClick={() => navigateTo('blog')}
              className={`py-2 transition-colors cursor-pointer whitespace-nowrap ${
                activePage === 'blog' ? 'text-white font-medium' : 'text-white/90 hover:text-white'
              }`}
            >
              Blogs
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('list-with-us')}
              className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded-full bg-white text-black font-inter text-xs font-medium hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Book an appraisal
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation"
              className="lg:hidden p-2 text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="mobile-navigation lg:hidden fixed inset-x-0 top-20 bg-[#202020] border-b border-white/15 p-6 space-y-4 z-50">
            <div className="flex flex-col space-y-3 text-sm font-inter">
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className="text-left py-1 text-white"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigateTo('listings', 'Residential Sale')}
                className="text-left py-1 text-white"
              >
                Buy — Residential For Sale
              </button>
              <button
                type="button"
                onClick={() => navigateTo('listings', 'Residential Lease')}
                className="text-left py-1 text-white"
              >
                Lease — Residential & Commercial
              </button>
              <button
                type="button"
                onClick={() => navigateTo('listings', 'Commercial')}
                className="text-left py-1 text-white"
              >
                Commercial property
              </button>
              <button
                type="button"
                onClick={() => navigateTo('list-with-us')}
                className="text-left py-1 text-white"
              >
                List with us / Book an Appraisal
              </button>
              <button
                type="button"
                onClick={() => navigateTo('team')}
                className="text-left py-1 text-white"
              >
                Meet the Team
              </button>
              <button
                type="button"
                onClick={() => navigateTo('videos')}
                className="text-left py-1 text-white"
              >
                Property Videos
              </button>
              <button
                type="button"
                onClick={() => navigateTo('blog')}
                className="text-left py-1 text-white"
              >
                Blogs & Market Insights
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main key={activePage} className="page-content flex-1" tabIndex={-1}>
        {/* =================================================================== */}
        {/* HOME VIEW — ARCHITECTURAL GRADIENT-TO-BLACK LAYOUT                  */}
        {/* =================================================================== */}
        {activePage === 'home' && (
          <div>
            {/* 1. CINEMATIC SPLIT-STAGE HERO WITH VIMEO VIDEO & GRADIENT-TO-BLACK */}
            <section className="relative w-full min-h-[570px] lg:min-h-[660px] bg-[#000000] overflow-hidden flex items-end">
              {/* Background Vimeo Video */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#000000]">
                <iframe
                  src={BRAND_ASSETS.heroVimeoEmbed}
                  title="Exceptional Real Estate Hero Video"
                  className="absolute top-1/2 left-1/2 w-[177.77vh] min-w-full min-h-full h-[56.25vw] -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none"
                  allow="autoplay; fullscreen"
                />
              </div>

              {/* Multi-layered Gradient-to-Black Scrim */}
              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    'linear-gradient(0deg, #141414 0%, transparent 28%), linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.18))',
                }}
              />

              {/* Hero Content Container */}
              <div className="relative z-20 w-full max-w-[1200px] mx-auto px-6 pb-12 sm:pb-16 pt-20 sm:pt-28">
                <div className="max-w-[780px]">
                  {/* Left 7 Columns: Editorial Headline & Subtext */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.2em] text-white/75 font-inter">
                      <span>Applecross</span>
                      <span>·</span>
                      <span>Perth Western Australia</span>
                    </div>
                    <h1
                      className="font-cormorant text-[44px] sm:text-[60px] lg:text-[68px] leading-[1.05] font-light text-white tracking-tight"
                      style={{ textWrap: 'balance' }}
                    >
                      Your next move.
                      Our local knowledge.
                    </h1>
                    <p className="font-inter text-base sm:text-lg font-light text-white/80 max-w-xl leading-relaxed">
                      Sales, leasing and property management, with a team based right here in Applecross.
                    </p>
                  </div>


                </div>

                {/* Property search */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (heroSaleMethod === 'Buy') {
                      navigateTo('listings', 'Residential Sale');
                    } else if (heroSaleMethod === 'Lease') {
                      navigateTo('listings', 'Residential Lease');
                    } else {
                      navigateTo('listings', 'Sold');
                    }
                  }}
                  className="property-search mt-12 bg-black/30 backdrop-blur-md text-white p-4 sm:p-5"
                >
                  <div className="flex flex-col lg:flex-row items-stretch gap-3">
                    {/* Buy / Lease / Sold Segmented Selector */}
                    <div className="flex bg-white/10 p-1 shrink-0">
                      {(['Buy', 'Lease', 'Sold'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setHeroSaleMethod(method)}
                          className={`px-5 py-2 text-xs font-inter rounded-full transition-colors cursor-pointer ${
                            heroSaleMethod === method
                              ? 'bg-white text-black font-medium'
                              : 'text-white/75 hover:text-white'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="flex-1 min-w-0 flex items-center bg-white border border-[#d8d8d8] px-4 h-11 min-h-11">
                      <Search className="w-4 h-4 text-[#666666] mr-3 shrink-0" />
                      <input
                        type="text"
                        value={searchSuburb}
                        onChange={(e) => setSearchSuburb(e.target.value)}
                        aria-label="Search by suburb, address or postcode" placeholder="Suburb, address or postcode"
                        className="w-full bg-transparent text-[#202020] placeholder:text-[#666666] text-sm font-inter font-light focus:outline-none"
                      />
                    </div>

                    {/* Advanced Filters Button */}
                    <button
                      type="button"
                      aria-expanded={showAdvancedHeroFilters}
                      aria-controls="property-search-filters"
                      onClick={() =>
                        setShowAdvancedHeroFilters(!showAdvancedHeroFilters)
                      }
                      className="px-4 h-11 bg-white border border-[#d8d8d8] hover:border-[#202020] text-xs font-inter text-[#202020] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Filters</span>
                    </button>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="px-8 h-11 rounded-full bg-[#000000] text-white hover:bg-[#302f2f] font-inter text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Search Properties
                    </button>
                  </div>

                  <div className={`filter-expansion ${showAdvancedHeroFilters ? 'is-open' : ''}`} inert={!showAdvancedHeroFilters} aria-hidden={!showAdvancedHeroFilters}>
                    <div><div id="property-search-filters" className="mt-3 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">
                          Property Type
                        </label>
                        <select
                          value={propertyTypeFilter}
                          onChange={(e) => setPropertyTypeFilter(e.target.value)}
                          className="zenu-input w-full h-9!"
                        >
                          <option value="ALL">All Property Types</option>
                          <option value="House">House</option>
                          <option value="Apartment / Penthouse">Apartment</option>
                          <option value="Townhouse">Townhouse</option>
                          <option value="Commercial Suite">Commercial</option>
                          <option value="Development Land">Land</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">
                          Minimum Bedrooms
                        </label>
                        <select
                          value={minBeds}
                          onChange={(e) => setMinBeds(Number(e.target.value))}
                          className="zenu-input w-full h-9!"
                        >
                          <option value={0}>Any Bedrooms</option>
                          <option value={2}>2+ Bedrooms</option>
                          <option value={3}>3+ Bedrooms</option>
                          <option value={4}>4+ Bedrooms</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-white/70 mb-1">
                          Listing Agent
                        </label>
                        <select
                          value={selectedAgentFilter}
                          onChange={(e) => setSelectedAgentFilter(e.target.value)}
                          className="zenu-input w-full h-9!"
                        >
                          <option value="ALL">All Agents</option>
                          {teamMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div></div>
                  </div>
                </form>
              </div>
            </section>

            {/* 2. CURATED "Explore our properties" (3 LISTINGS BY DEFAULT WITH SHOW MORE) */}
            <section className="home-listings bg-[#141414] text-white py-20 sm:py-28 px-6">
              <div className="max-w-[1200px] mx-auto space-y-10">
                {/* Header & Category Filter Pills */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">
                      Find your place in Perth
                    </p>
                    <h2 className="font-cormorant text-4xl sm:text-5xl font-light text-white tracking-wide">
                      Explore our properties
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { label: 'All Listings', value: 'ALL' },
                        { label: 'For Sale', value: 'Residential Sale' },
                        { label: 'For Lease', value: 'Residential Lease' },
                        { label: 'Commercial', value: 'Commercial' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(tab.value);
                          setShowAllHomeListings(false);
                        }}
                        className={`px-4 py-1.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
                          selectedCategory === tab.value
                            ? 'bg-white text-black border-white font-medium'
                            : 'bg-transparent text-white/70 border-transparent hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3-Column Architectural Grid (Minimised to 3 by default, expandable with Show More) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {homeDisplayedListings.map((property) => (
                    <PropertyCard key={property.id} property={property}
                      agentName={teamMembers.find((agent) => agent.id === property.agentId)?.name}
                      onSelect={setSelectedProperty} />
                  ))}
                  {homeDisplayedListings.length === 0 && (
                    <p className="col-span-full py-12 text-white/60">No properties match your search. Try another suburb or change your filters.</p>
                  )}
                </div>

                {/* Show More / View Full Directory Footer Bar (No Add/Edit buttons on public site) */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-white/60">
                    Showing {homeDisplayedListings.length} of {filteredListings.length} properties.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {filteredListings.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllHomeListings(!showAllHomeListings)}
                        className="zenu-button"
                      >
                        {showAllHomeListings
                          ? 'Show fewer properties'
                          : `Show ${filteredListings.length - 3} more properties`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigateTo('listings', 'ALL')}
                      className="zenu-button-outline-light"
                    >
                      Browse all properties
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. ARCHITECTURAL SPLIT-SHOWCASE: "People who know your neighbourhood." & "How we can help" */}
            <section className="bg-[#141414] py-20 sm:py-28 px-6">
              <div className="max-w-[1200px] mx-auto">
                <div className="reveal-block grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  {/* Left 5 Columns: Proposition & How We Can Help Box */}
                  <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Applecross · Licence No. RA84388
                      </p>
                      <h2 className="font-cormorant text-3xl sm:text-4xl leading-tight font-medium text-white">
                        People who know your neighbourhood.
                      </h2>
                      <p className="font-inter text-base text-white/80 font-light leading-relaxed">
                        Meet the people behind your next move, at our office on Kintail Road.
                      </p>
                    </div>

                    {/* Gradient-to-Black Framed Fieldset */}
                    <fieldset className="service-panel min-w-0 pt-2">
                      <legend className="pb-4 font-inter text-lg font-medium text-white">
                        How we can help
                      </legend>
                      <p className="font-inter text-sm sm:text-base leading-relaxed font-light text-white/85">
                        Residential and commercial sales are handled by our sales team, leasing and property management are overseen personally by Wendy Chia (Director &amp; Licensee, Licence No. RA84388), and select properties are also available off-market with details shared privately on request.
                      </p>
                      <div className="pt-2 mt-6 flex flex-wrap items-center gap-4">
                        <a
                          href="https://www.instagram.com/wendychiarealty/"
                          target="_blank"
                          rel="noreferrer"
                          className="zenu-button"
                        >
                          Speak with Wendy
                        </a>
                        <button
                          type="button"
                          onClick={() => navigateTo('list-with-us')}
                          className="zenu-button-outline-light"
                        >
                          Book an appraisal
                        </button>
                      </div>
                    </fieldset>
                  </div>

                  {/* Right 7 Columns: Original Agency Banner Framed with Gradient Fade */}
                  <button type="button" onClick={() => navigateTo('team')} aria-label="Meet the Exceptional Real Estate team" className="editorial-card text-left lg:col-span-7 relative overflow-hidden bg-black">
                    <PropertyImage
                      src={BRAND_ASSETS.teamBannerImage}
                      alt="Exceptional Real Estate Applecross Office"
                      className="w-full aspect-16/10 object-cover"
                    />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.88) 100%)',
                      }}
                    />
                    <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between text-white">
                      <div>
                        <p className="font-cormorant text-2xl font-light">
                          Exceptional Real Estate Applecross
                        </p>
                        <p className="text-xs text-white/70 font-inter">
                          2/28 Kintail Road, Applecross WA 6153
                        </p>
                      </div>
                      <span className="card-action text-xs font-inter underline text-white/90"
                      >
                        Meet our team
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* 4. COMMERCIAL PROPERTIES & LATEST NEWS DUAL SHOWCASE (Gradient-to-Black) */}
            <section className="bg-[#141414] pb-24 sm:pb-32 pt-8 sm:pt-12 px-6">
              <div className="max-w-[1200px] mx-auto space-y-20">
                {/* Commercial Spotlight */}
                <div className="reveal-block grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                  <div className="lg:col-span-5 space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                      For your business
                    </p>
                    <h2 className="font-cormorant text-3xl sm:text-4xl font-medium text-white">
                      Commercial property
                    </h2>
                    <p className="font-inter text-base text-white/80 font-light leading-relaxed">
                      Sales and leasing across Perth&apos;s commercial precincts — including high-exposure Canning Highway suites in Applecross and Mount Pleasant.
                    </p>
                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => navigateTo('listings', 'Commercial')}
                        className="zenu-button-outline-light"
                      >
                        Explore Commercial Listings
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    {commercialListings.slice(0, 1).map((prop) => (
                      <button
                        type="button"
                        aria-label={`View ${prop.title}, ${prop.suburb}`}
                        key={prop.id}
                        onClick={() => setSelectedProperty(prop)}
                        className="editorial-card w-full text-left group relative h-[360px] bg-black overflow-hidden cursor-pointer"
                      >
                        <PropertyImage
                          src={prop.imageUrl}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.88) 100%)',
                          }}
                        />
                        <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
                          <div>
                            <span className="text-xs uppercase tracking-widest text-white/70">
                              {prop.suburb} · Commercial
                            </span>
                            <h3 className="font-inter text-2xl sm:text-3xl font-normal mt-1">
                              {prop.title}
                            </h3>
                            <p className="font-inter text-sm text-white/85 mt-1">
                              {prop.priceDisplay}
                            </p>
                          </div>
                          <span className="zenu-button text-xs!">
                            Inspect Property
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* From our team Magazine Card */}
                {latestBlogHighlight && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-cormorant text-3xl sm:text-4xl font-normal text-white">
                        From our team
                      </h2>
                      <button
                        type="button"
                        onClick={() => navigateTo('blog')}
                        className="text-xs font-inter text-white/80 hover:text-white underline cursor-pointer"
                      >
                        View All {blogPosts.length} Blog Articles
                      </button>
                    </div>

                    <button type="button" aria-label={`Read ${latestBlogHighlight.title}`} onClick={() => openBlogPost(latestBlogHighlight.id)} className="editorial-card w-full text-left bg-transparent grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                      <div className="lg:col-span-7 overflow-hidden">
                        <PropertyImage
                          src={latestBlogHighlight.imageUrl}
                          alt={latestBlogHighlight.title}
                          className="w-full h-full object-cover min-h-[340px]"
                        />
                      </div>
                      <div className="lg:col-span-5 py-8 lg:py-10 lg:pl-12 flex flex-col justify-center space-y-5">
                        <span className="text-xs uppercase tracking-widest text-white/60">
                          {latestBlogHighlight.category} · {latestBlogHighlight.date}
                        </span>
                        <h3 className="font-cormorant text-3xl sm:text-4xl font-light text-white leading-tight">
                          {latestBlogHighlight.title}
                        </h3>
                        <p className="font-inter text-sm font-light text-white/80 leading-relaxed">
                          {latestBlogHighlight.excerpt}
                        </p>
                        <div className="pt-2">
                          <span className="card-action zenu-button-outline-light"
                          >
                            Read article
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: PROPERTIES DIRECTORY (Public View Only — No Edit Buttons)   */}
        {/* =================================================================== */}
        {activePage === 'listings' && (
          <section className="py-16 px-6 max-w-[1200px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/60">
                  Buy, lease or explore recent results
                </p>
                <h1 className="font-cormorant text-4xl sm:text-5xl font-light text-white mt-1">
                  {selectedCategory === 'ALL' ? 'Current Listings' : selectedCategory}
                </h1>
              </div>
              <p className="text-xs text-white/65 font-inter">
                Showing {filteredListings.length} of {listings.length} properties across Greater Perth
              </p>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#202020] border border-white/20 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { label: 'All Properties', value: 'ALL' },
                      { label: 'Residential For Sale', value: 'Residential Sale' },
                      { label: 'Residential For Lease', value: 'Residential Lease' },
                      { label: 'Commercial', value: 'Commercial' },
                      { label: 'Sold', value: 'Sold' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setSelectedCategory(tab.value)}
                      className={`px-4 py-1.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
                        selectedCategory === tab.value
                          ? 'bg-white text-black border-white font-medium'
                          : 'bg-black/70 text-white/80 border-white/25 hover:border-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-white/60 tabular-nums">
                  {filteredListings.length} properties found
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-white/15">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchSuburb}
                    onChange={(e) => setSearchSuburb(e.target.value)}
                    placeholder="Search Address, Suburb or Postcode..."
                    className="zenu-input w-full pl-9!"
                  />
                </div>

                <select
                  aria-label="Filter by property type"
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  className="zenu-input w-full"
                >
                  <option value="ALL">All Property Types</option>
                  <option value="House">House</option>
                  <option value="Apartment / Penthouse">Apartment</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Commercial Suite">Commercial</option>
                  <option value="Development Land">Land</option>
                </select>

                <select
                  aria-label="Filter by agent"
                  value={selectedAgentFilter}
                  onChange={(e) => setSelectedAgentFilter(e.target.value)}
                  className="zenu-input w-full"
                >
                  <option value="ALL">All Agents</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid of Gradient-to-Black Property Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((property) => (
                <PropertyCard key={property.id} property={property}
                  agentName={teamMembers.find((agent) => agent.id === property.agentId)?.name}
                  onSelect={setSelectedProperty} />
              ))}
              {filteredListings.length === 0 && (
                <p className="col-span-full py-12 text-center text-white/75">No properties match these filters. Try another suburb or clear your filters.</p>
              )}
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* VIEW 3: LIST WITH US / BOOK AN APPRAISAL                            */}
        {/* =================================================================== */}
        {activePage === 'list-with-us' && (
          <section className="py-16 px-6 max-w-[1000px] mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h1 className="font-cormorant text-3xl sm:text-5xl font-medium text-white">
                People who know your neighbourhood.
              </h1>
              <p className="font-inter text-base text-white/80 font-light max-w-2xl mx-auto">
                Residential and commercial sales are handled by our sales team, leasing and property management are overseen personally by Wendy Chia (Director &amp; Licensee, Licence No. RA84388), and select properties are also available off-market.
              </p>
            </div>

            <div className="bg-[#202020] border border-[#c6c6c6]/50 p-8 sm:p-12">
              <h2 className="font-cormorant text-3xl sm:text-4xl font-light text-white text-center">
                Book an Appraisal
              </h2>
              <p className="text-center text-xs text-white/70 mt-2 font-inter">
                2/28 Kintail Road, Applecross 6153 · Personalised guidance. Results that speak.
              </p>

              {appraisalSubmitted ? (
                <div className="mt-8 p-6 bg-black border border-white text-center space-y-4">
                  <div className="inline-flex items-center gap-2 text-white font-medium">
                    <Check className="w-5 h-5" />
                    <span>Appraisal Request Received</span>
                  </div>
                  <p className="text-xs text-white/85 leading-relaxed max-w-lg mx-auto">
                    Thank you, {appraisalForm.fullName}. Your appraisal request for{' '}
                    <strong>{appraisalForm.propertyAddress}</strong> has been received by our Applecross team.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAppraisalSubmitted(false)}
                    className="zenu-button-outline-light"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAppraisalSubmit} className="mt-8 space-y-4">
                  {appraisalError && (
                    <p className="text-xs text-red-400 bg-red-950/50 border border-red-700 p-3">
                      {appraisalError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/80 mb-1">
                        Service Required
                      </label>
                      <select
                        value={appraisalForm.serviceInterest}
                        onChange={(e) =>
                          setAppraisalForm({
                            ...appraisalForm,
                            serviceInterest: e.target.value,
                          })
                        }
                        className="zenu-input w-full"
                      >
                        <option value="Sell with us — Free Sales Appraisal">
                          Sell with us — Free Sales Appraisal
                        </option>
                        <option value="Lease with us — Property Management Appraisal">
                          Lease with us — Property Management Appraisal
                        </option>
                        <option value="Build with us — Development & Construction">
                          Build with us — Development & Construction
                        </option>
                        <option value="Commercial Sale / Lease Enquiry">
                          Commercial Sale / Lease Enquiry
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-white/80 mb-1">
                        Preferred Team Member
                      </label>
                      <select
                        value={appraisalForm.preferredAgent}
                        onChange={(e) =>
                          setAppraisalForm({
                            ...appraisalForm,
                            preferredAgent: e.target.value,
                          })
                        }
                        className="zenu-input w-full"
                      >
                        {teamMembers.map((m) => (
                          <option key={m.id} value={`${m.name} (${m.role})`}>
                            {m.name} — {m.role}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input
                      type="text"
                      required
                      value={appraisalForm.fullName}
                      onChange={(e) =>
                        setAppraisalForm({ ...appraisalForm, fullName: e.target.value })
                      }
                      placeholder="Full Name"
                      className="zenu-input w-full"
                    />
                    <input
                      type="tel"
                      required
                      value={appraisalForm.phone}
                      onChange={(e) =>
                        setAppraisalForm({ ...appraisalForm, phone: e.target.value })
                      }
                      placeholder="0400 000 000"
                      className="zenu-input w-full"
                    />
                    <input
                      type="email"
                      required
                      value={appraisalForm.email}
                      onChange={(e) =>
                        setAppraisalForm({ ...appraisalForm, email: e.target.value })
                      }
                      placeholder="john@smith.com"
                      className="zenu-input w-full"
                    />
                  </div>

                  <input
                    type="text"
                    required
                    value={appraisalForm.propertyAddress}
                    onChange={(e) =>
                      setAppraisalForm({
                        ...appraisalForm,
                        propertyAddress: e.target.value,
                      })
                    }
                    placeholder="Property Address, Suburb and Postcode"
                    className="zenu-input w-full"
                  />

                  <textarea
                    rows={4}
                    value={appraisalForm.notes}
                    onChange={(e) =>
                      setAppraisalForm({ ...appraisalForm, notes: e.target.value })
                    }
                    placeholder="Additional property details or preferred time for a call..."
                    className="w-full p-3 font-inter text-sm text-[#363636] bg-[#ededed] border border-[#f7f9fa]"
                  />

                  <div className="pt-2 flex justify-center">
                    <button type="submit" className="zenu-button-outline-light px-10!">
                      Book an appraisal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* VIEW 4: MEET THE TEAM (Dedicated Page)                              */}
        {/* =================================================================== */}
        {activePage === 'team' && (
          <section className="py-16 px-6 max-w-[1200px] mx-auto space-y-12">
            <div className="text-center">
              <h1 className="font-cormorant text-[42px] sm:text-[54px] leading-tight mb-4 font-normal text-white">
                Meet the Team
              </h1>
              <p className="font-inter text-sm font-bold text-[#f0f0f0]">
                Sales and property management sit with different people, on purpose.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="team-card bg-transparent flex flex-col h-full overflow-hidden"
                >
                  <button type="button" onClick={() => openTeamMember(member.id)} aria-label={`View ${member.name}’s profile`} className="team-profile-link text-left flex-1 cursor-pointer">
                  <div className="relative min-h-[384px] w-full overflow-hidden bg-black">
                    <PropertyImage
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-full h-full object-cover object-top absolute inset-0"
                    />
                  </div>
                  <div className="pt-6">
                    <div>
                      <h2 className="font-cormorant text-3xl font-light text-white mb-1">
                        {member.name}
                      </h2>
                      <div className="font-inter text-xs font-medium text-white/80 mb-3">
                        {member.role}
                      </div>
                      <p className="text-xs text-white/70 font-light leading-relaxed">
                        {member.bio}
                      </p>
                      <span className="inline-flex items-center gap-2 text-xs text-white/80 mt-5">View profile <ArrowUpRight className="w-4 h-4" aria-hidden="true" /></span>
                    </div>
                  </div>
                  </button>
                    <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-white">
                      <a
                        href={`mailto:${member.email}`}
                        className="flex items-center gap-2 hover:text-white/75"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email Agent</span>
                      </a>
                      <a
                        href={`tel:${member.phone.replace(/\s+/g, '')}`}
                        className="flex items-center gap-2 hover:text-white/75 tabular-nums"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{member.phone}</span>
                      </a>
                    </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === 'team-profile' && selectedTeamMember && (
          <TeamMemberProfile key={selectedTeamMember.id} member={selectedTeamMember} listings={listings}
            onBack={() => navigateTo('team')} onSelectProperty={setSelectedProperty} />
        )}

        {/* =================================================================== */}
        {/* VIEW 5: PROPERTY VIDEOS                                             */}
        {/* =================================================================== */}
        {activePage === 'videos' && (
          <section className="py-16 px-6 max-w-[1100px] mx-auto space-y-8">
            <div className="text-center">
              <h1 className="font-cormorant text-4xl sm:text-5xl font-light text-white">
                Property Videos
              </h1>
              <p className="text-sm text-white/75 mt-2">
                Cinematic property showcases across Applecross and Greater Perth.
              </p>
            </div>

            <div className="aspect-16/9 w-full bg-black overflow-hidden">
              <iframe
                src="https://player.vimeo.com/video/1097764829?badge=0&autopause=0&player_id=0&app_id=58479"
                title="Exceptional Real Estate Property Showcase"
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
              />
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* VIEW 6: DEDICATED BLOGS & MARKET INSIGHTS PAGE                      */}
        {/* =================================================================== */}
        {activePage === 'blog' && (
          <section className="py-16 px-6 max-w-[1200px] mx-auto space-y-12">
            {activeBlogPost ? (
              /* Single Blog Post Reader View */
              <div className="max-w-[920px] mx-auto space-y-8">
                <button
                  type="button"
                  onClick={() => setSelectedBlogPostId(null)}
                  className="inline-flex items-center gap-2 text-xs font-inter text-white/80 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to All Blog Articles
                </button>

                <article className="bg-transparent overflow-hidden">
                  <div className="aspect-16/9 w-full bg-black overflow-hidden">
                    <PropertyImage
                      src={activeBlogPost.imageUrl}
                      alt={activeBlogPost.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-8 sm:p-12 space-y-6">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/65 font-inter">
                      <span className="bg-black/70 border border-white/20 px-3 py-1 text-white">
                        {activeBlogPost.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {activeBlogPost.date}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {activeBlogPost.author}
                      </span>
                    </div>

                    <h1 className="font-cormorant text-3xl sm:text-5xl font-light text-white leading-tight">
                      {activeBlogPost.title}
                    </h1>

                    <div className="space-y-5 pt-2">
                      {activeBlogPost.content.map((paragraph, idx) => (
                        <p
                          key={idx}
                          className="text-white/85 font-inter font-light leading-relaxed text-base"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    <div className="pt-8 mt-8 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-cormorant text-2xl text-white">
                          Thinking of selling or leasing in Perth?
                        </p>
                        <p className="text-xs text-white/65 mt-0.5">
                          Speak directly with our Applecross specialists at 2/28 Kintail Road.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateTo('list-with-us')}
                        className="zenu-button-outline-light"
                      >
                        Book an appraisal
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            ) : (
              /* Blogs Directory View */
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-2">
                      Market Intelligence & Insights
                    </p>
                    <h1 className="font-cormorant text-4xl sm:text-5xl font-light text-white">
                      Blogs &amp; Property News
                    </h1>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {blogCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setBlogCategoryFilter(cat)}
                        className={`px-4 py-1.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
                          blogCategoryFilter === cat
                            ? 'bg-white text-black border-white font-medium'
                            : 'bg-black/60 text-white/75 border-white/25 hover:border-white hover:text-white'
                        }`}
                      >
                        {cat === 'ALL' ? 'All Articles' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Featured Lead Article */}
                {filteredBlogs[0] && (
                  <button
                    type="button"
                    aria-label={`Read ${filteredBlogs[0].title}`}
                    onClick={() => openBlogPost(filteredBlogs[0].id)}
                    className="editorial-card w-full text-left bg-transparent grid grid-cols-1 lg:grid-cols-12 overflow-hidden cursor-pointer group hover:border-white/45 transition-colors"
                  >
                    <div className="lg:col-span-7 overflow-hidden bg-black">
                      <PropertyImage
                        src={filteredBlogs[0].imageUrl}
                        alt={filteredBlogs[0].title}
                        className="w-full h-full object-cover min-h-[340px] group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="lg:col-span-5 py-8 lg:py-10 lg:pl-12 flex flex-col justify-center space-y-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60">
                        <span>{filteredBlogs[0].category}</span>
                        <span>·</span>
                        <span>{filteredBlogs[0].date}</span>
                      </div>
                      <h2 className="font-cormorant text-3xl sm:text-4xl font-light text-white leading-tight group-hover:underline">
                        {filteredBlogs[0].title}
                      </h2>
                      <p className="font-inter text-sm font-light text-white/80 leading-relaxed line-clamp-4">
                        {filteredBlogs[0].excerpt}
                      </p>
                      <p className="text-xs text-white/60 pt-1">
                        By {filteredBlogs[0].author}
                      </p>
                      <div className="pt-2">
                        <span className="zenu-button-outline-light inline-flex items-center gap-2">
                          Read Article
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                )}

                {/* All Blog Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBlogs.map((post) => (
                    <button type="button" aria-label={`Read ${post.title}`}
                      key={post.id}
                      onClick={() => openBlogPost(post.id)}
                      className="editorial-card w-full text-left bg-transparent transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
                    >
                      <div>
                        <div className="aspect-16/9 w-full bg-black overflow-hidden">
                          <PropertyImage
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-6 space-y-3">
                          <div className="flex items-center justify-between text-[11px] text-white/60 uppercase tracking-wider">
                            <span>{post.category}</span>
                            <span>{post.date}</span>
                          </div>
                          <h3 className="font-cormorant text-2xl font-light text-white leading-snug group-hover:underline">
                            {post.title}
                          </h3>
                          <p className="text-xs text-white/75 font-light leading-relaxed line-clamp-3">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 py-4 border-t border-white/15 flex items-center justify-between text-xs text-white/75">
                        <span>By {post.author}</span>
                        <span className="inline-flex items-center gap-1 text-white group-hover:underline">
                          Read More
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* =================================================================== */}
      {/* FOOTER WITH GRADIENT-TO-BLACK                                       */}
      {/* =================================================================== */}
      <footer className="bg-[#141414] text-white py-20 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-sm font-inter font-light">
            {/* Column 1: Logo & Office Address */}
            <div className="space-y-4">
              <img
                src={BRAND_ASSETS.logoLightOnDark}
                alt="Exceptional Real Estate"
                referrerPolicy="no-referrer"
                className="brand-logo h-10 w-auto object-contain"
              />
              <div className="flex items-start gap-2 text-xs text-white/80">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>2/28 Kintail Road, Applecross 6153</span>
              </div>
            </div>

            {/* Column 2: Sell */}
            <div>
              <div className="flex items-center gap-2 font-normal text-white mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>Sell</span>
              </div>
              <ul className="space-y-2 pl-4 text-white/75 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="hover:text-white cursor-pointer"
                  >
                    Selling With Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Sold')}
                    className="hover:text-white cursor-pointer"
                  >
                    Sold
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="hover:text-white cursor-pointer"
                  >
                    Book an Appraisal
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Properties */}
            <div>
              <div className="flex items-center gap-2 font-normal text-white mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>Properties</span>
              </div>
              <ul className="space-y-2 pl-4 text-white/75 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'ALL')}
                    className="hover:text-white cursor-pointer"
                  >
                    Buying With Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Residential Sale')}
                    className="hover:text-white cursor-pointer"
                  >
                    For Sale
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Residential Lease')}
                    className="hover:text-white cursor-pointer"
                  >
                    For Rent
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Agency & Blogs */}
            <div>
              <div className="flex items-center gap-2 font-normal text-white mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>Explore</span>
              </div>
              <ul className="space-y-2 pl-4 text-white/75 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('team')}
                    className="hover:text-white cursor-pointer"
                  >
                    Meet the Team
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('blog')}
                    className="hover:text-white cursor-pointer"
                  >
                    Blogs &amp; News
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 5: Social Links */}
            <div className="flex lg:justify-end items-start gap-3">
              <a
                href="https://www.instagram.com/exceptionalrealestate/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white/80 hover:text-white border border-white/30 px-3.5 py-1.5 rounded-full"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61577338962576"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white/80 hover:text-white border border-white/30 px-3.5 py-1.5 rounded-full"
              >
                Facebook
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60">
            <span>© {new Date().getFullYear()} Exceptional Real Estate · Applecross WA 6153</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigateTo('list-with-us')}
                className="hover:text-white cursor-pointer"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* PROPERTY DETAIL & ENQUIRY MODAL */}
      <PropertyDetailModal
        property={selectedProperty}
        agents={teamMembers}
        onClose={() => setSelectedProperty(null)}
        onSubmitEnquiry={handleAddEnquiry}
      />
    </div>
  );
}
