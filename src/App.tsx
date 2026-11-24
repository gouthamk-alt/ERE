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
import { Careers } from './components/Careers';
import { VideoLibrary } from './components/VideoLibrary';
import { AdminAccess } from './components/AdminAccess';
import { useWebsiteContent } from './useWebsiteContent';
import { usePageMotion } from './usePageMotion';
import { submitEnquiry, type EnquiryReceipt } from './enquiries';
import { EnquiryConfirmation } from './components/EnquiryConfirmation';
import { EnquirySpamField } from './components/EnquirySpamField';
import DOMPurify from 'dompurify';
import { NewsletterOptIn } from './components/NewsletterOptIn';
import { TestimonialsCarousel } from './components/TestimonialsCarousel';

const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));

type ActivePage =
  | 'home'
  | 'listings'
  | 'list-with-us'
  | 'team'
  | 'team-profile'
  | 'careers'
  | 'videos'
  | 'blog';

const STORAGE_KEY_ENQUIRIES = 'exceptional_re_zenu_enquiries_v3';

export default function App() {
  const { listings, blogPosts, teamMembers, testimonials, ready: contentReady, error: contentError, saving, refresh: refreshContent, save: saveContent, browserEdits, importBrowserEdits } = useWebsiteContent();

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

  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  usePageMotion(activePage, contentReady);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!openDropdown && !mobileMenuOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-navigation-dropdown]')) setOpenDropdown(null);
      if (!target.closest('header')) setMobileMenuOpen(false);
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openDropdown) document.querySelector<HTMLButtonElement>(`[data-dropdown-trigger="${openDropdown}"]`)?.focus();
      setOpenDropdown(null);
      setMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [openDropdown, mobileMenuOpen]);

  // Six properties on the homepage; the directory contains the full collection.

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
    preferredAgent: 'Wendy Chia (Director & Licensee)',
    notes: '',
    newsletterOptIn:true,
  });
  const [appraisalSubmitted, setAppraisalSubmitted] = useState(false);
  const [appraisalError, setAppraisalError] = useState('');
  const [appraisalBusy, setAppraisalBusy] = useState(false);
  const appraisalLock = React.useRef(false);
  const [enquiryReceipt, setEnquiryReceipt] = useState<EnquiryReceipt | null>(null);

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
    setShowAdvancedHeroFilters(false);
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

  const handleAddEnquiry = submitEnquiry;

  const handleUpdateEnquiryStatus = (id: string, status: ClientEnquiry['status']) => {
    setEnquiries((prev) =>
      prev.map((enq) => (enq.id === id ? { ...enq, status } : enq))
    );
  };

  const handleAppraisalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (appraisalLock.current) return;
    const website = String(new FormData(e.currentTarget as HTMLFormElement).get('website') || '');
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

    appraisalLock.current = true;
    setAppraisalBusy(true);
    setAppraisalError('');
    try {
    const receipt = await handleAddEnquiry({
      type: 'Free Appraisal',
      clientName: appraisalForm.fullName.trim(),
      email: appraisalForm.email.trim(),
      phone: appraisalForm.phone.trim(),
      suburbOrAddress: appraisalForm.propertyAddress.trim(),
      message: appraisalForm.notes.trim() || 'Appraisal requested via website.',
      agentName: appraisalForm.preferredAgent,
      serviceInterest: appraisalForm.serviceInterest,
      website,
      newsletterOptIn:appraisalForm.newsletterOptIn,
    });

    setAppraisalSubmitted(true);
    setEnquiryReceipt(receipt);
    } catch (error) {
      setAppraisalError(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      appraisalLock.current = false;
      setAppraisalBusy(false);
    }
  };

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (selectedCategory === 'ALL' && ['Sold', 'Leased'].includes(item.status)) return false;
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
    return filteredListings.slice(0, 6);
  }, [filteredListings]);

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
          testimonials={testimonials}
          onSaveTestimonial={(item, existing) => saveContent({collection:'testimonials',action:existing?'update':'add',item})}
          onDeleteTestimonial={id=>saveContent({collection:'testimonials',action:'delete',id})}
          onReorderTestimonials={ids=>saveContent({collection:'testimonials',action:'reorder',ids})}
          enquiries={enquiries}
          blogPosts={blogPosts}
          onAddListing={handleAddListing}
          onUpdateListing={handleUpdateListing}
          onDeleteListing={handleDeleteListing}
          onAddBlogPost={handleAddBlogPost}
          onUpdateBlogPost={handleUpdateBlogPost}
          onSaveTeamMember={(item, existing) => saveContent({collection:'teamMembers',action:existing?'update':'add',item})}
          onDeleteTeamMember={id=>saveContent({collection:'teamMembers',action:'delete',id})}
          onReorderTeamMembers={ids=>saveContent({collection:'teamMembers',action:'reorder',ids})}
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

  return (
    <div className="public-site min-h-screen flex flex-col bg-[#000000] text-white font-inter">
      {/* =================================================================== */}
      {/* ARCHITECTURAL HEADER (Gradient-to-Black Glass Bar)                  */}
      {/* =================================================================== */}
      {contentError && <div role="alert" className="bg-[#302f2f] px-6 py-3 text-sm">Properties and articles are temporarily unavailable. <button className="underline" onClick={() => void refreshContent()}>Try again</button></div>}
      <header className="sticky top-0 z-40 h-20 bg-[#000000]/95 backdrop-blur-md text-white px-6 lg:px-12">
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
          <nav className="hidden xl:flex items-center gap-5 text-sm font-inter font-light">
            {/* Buy Dropdown */}
            <div
              className="relative" data-navigation-dropdown
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenDropdown(null); }}
            >
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'buy' ? null : 'buy')}
                data-dropdown-trigger="buy" aria-expanded={openDropdown === 'buy'} aria-controls="buy-navigation"
                className="flex items-center gap-1.5 py-2 text-white/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Buy</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {openDropdown === 'buy' && (
                <div id="buy-navigation" className="absolute left-0 top-full w-56 bg-[#202020] border border-white/15 py-2 shadow-2xl z-50">
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
              className="relative" data-navigation-dropdown
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenDropdown(null); }}
            >
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'lease' ? null : 'lease')}
                data-dropdown-trigger="lease" aria-expanded={openDropdown === 'lease'} aria-controls="lease-navigation"
                className="flex items-center gap-1.5 py-2 text-white/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Lease</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {openDropdown === 'lease' && (
                <div id="lease-navigation" className="absolute left-0 top-full w-56 bg-[#202020] border border-white/15 py-2 shadow-2xl z-50">
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
              className="relative" data-navigation-dropdown
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenDropdown(null); }}
            >
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'list' ? null : 'list')}
                data-dropdown-trigger="list" aria-expanded={openDropdown === 'list'} aria-controls="list-navigation"
                className="flex items-center gap-1.5 py-2 text-white/90 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>List with us</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              {openDropdown === 'list' && (
                <div id="list-navigation" className="absolute left-0 top-full w-52 bg-[#202020] border border-white/15 py-2 shadow-2xl z-50">
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
            <button type="button" onClick={() => navigateTo('careers')} className="py-2 text-white/90 hover:text-white cursor-pointer whitespace-nowrap">Careers</button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('list-with-us')}
              className="accent-button hidden sm:inline-flex items-center justify-center px-5 h-9 rounded-full bg-white text-black font-inter text-xs font-medium hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Book an appraisal
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation"
              className="xl:hidden p-2 text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="mobile-navigation xl:hidden fixed inset-x-0 top-20 bg-[#202020] border-b border-white/15 p-6 space-y-4 z-50">
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
              <button type="button" onClick={() => navigateTo('careers')} className="text-left py-1 text-white">Careers</button>
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
                    'linear-gradient(0deg, #000000 0%, transparent 28%), linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.18))',
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
                      className="font-cormorant text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.05] font-light text-white tracking-tight"
                      style={{ textWrap: 'balance' }}
                    >
                      Your next chapter begins with us.
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
                  className="property-search compact-search mt-10"
                >
                  <div className="compact-search-row">
                    {/* Buy / Lease / Sold Segmented Selector */}
                    <div className="search-methods">
                      {(['Buy', 'Lease', 'Sold'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setHeroSaleMethod(method)}
                          aria-pressed={heroSaleMethod === method}
                          className={`search-method ${heroSaleMethod === method ? 'is-selected' : ''}`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="search-query">
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
                      className="search-filter-toggle"
                      aria-label="Filters"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span className="search-filter-label">Filters</span>
                    </button>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="search-submit"
                      aria-label="Search Properties"
                    >
                      <Search className="search-submit-icon w-4 h-4" aria-hidden="true" />
                      <span className="search-submit-label">Search Properties</span>
                    </button>
                  </div>

                  <div className={`filter-expansion ${showAdvancedHeroFilters ? 'is-open' : ''}`} inert={!showAdvancedHeroFilters} aria-hidden={!showAdvancedHeroFilters}>
                    <div><div id="property-search-filters" className="mt-3 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                      <div>
                        <label className="block text-[11px] text-[#666666] mb-1">
                          Property Type
                        </label>
                        <select
                          value={propertyTypeFilter}
                          onChange={(e) => setPropertyTypeFilter(e.target.value)}
                          className="zenu-input w-full h-9!"
                        >
                          <option value="ALL">All Property Types</option>
                          {[...new Set(listings.map(item => item.propertyType))].sort().map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#666666] mb-1">
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
                        <label className="block text-[11px] text-[#666666] mb-1">
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

            {/* 2. CURATED "Explore our properties" (6 LISTINGS WITH A VIEW ALL LINK) */}
            <section className="home-listings bg-[#000000] text-white py-20 sm:py-28 px-6">
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
                        }}
                        aria-pressed={selectedCategory === tab.value}
                        className={`home-category-filter px-4 py-1.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
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

                {/* 3-Column Architectural Grid (Six properties by default) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy={!contentReady}>
                  {!contentReady && !contentError && Array.from({ length: 6 }, (_, index) => (
                    <div key={index} aria-hidden="true" className="min-h-[420px] bg-[#171717]">
                      <div className="aspect-[4/3] bg-[#252525]" />
                      <div className="space-y-4 p-5"><div className="h-3 w-24 bg-[#303030]" /><div className="h-6 w-3/4 bg-[#303030]" /><div className="h-4 w-1/3 bg-[#303030]" /></div>
                    </div>
                  ))}
                  {homeDisplayedListings.map((property) => (
                    <PropertyCard key={property.id} property={property}
                      agentName={teamMembers.find((agent) => agent.id === property.agentId)?.name}
                      onSelect={setSelectedProperty} />
                  ))}
                  {contentReady && homeDisplayedListings.length === 0 && (
                    <p className="col-span-full py-12 text-white/60">No properties match your search. Try another suburb or change your filters.</p>
                  )}
                </div>

                {/* Show More / View Full Directory Footer Bar (No Add/Edit buttons on public site) */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-white/60">{contentReady ? `Showing ${homeDisplayedListings.length} of ${filteredListings.length} properties.` : 'Explore our current properties'}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => navigateTo('listings')} className="zenu-button inline-flex gap-2">
                      View all properties <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Familiar faces, visible on the homepage. */}
            <section className="home-team bg-[#000000] pb-20 sm:pb-28 px-6">
              <div className="max-w-[1200px] mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="max-w-2xl space-y-4">
                    <p className="accent-label text-xs uppercase tracking-[0.2em]">Applecross · Licence No. RA84388</p>
                    <h2 className="font-cormorant text-4xl sm:text-5xl text-white">People who know<br />your neighbourhood.</h2>
                    <p className="text-sm sm:text-base text-white/70 font-light leading-relaxed">Meet the people behind your next move, at our office on Kintail Road.</p>
                  </div>
                  <button type="button" onClick={() => navigateTo('team')} className="accent-link inline-flex items-center gap-2 text-sm cursor-pointer">Meet our full team <ArrowUpRight className="w-4 h-4" aria-hidden="true" /></button>
                </div>
                <div className="home-team-grid grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-8" aria-busy={!contentReady}>
                  {!contentReady && !contentError && Array.from({ length: 4 }, (_, index) => (
                    <div key={index} aria-hidden="true"><div className="aspect-4/5 bg-[#202020]" /><div className="mt-4 h-5 w-2/3 bg-[#303030]" /><div className="mt-3 h-3 w-1/2 bg-[#303030]" /></div>
                  ))}
                  {teamMembers.slice(0, 4).map((member) => (
                    <button type="button" key={member.id} onClick={() => openTeamMember(member.id)} aria-label={`View ${member.name}’s profile`} className="home-team-person text-left cursor-pointer group">
                      <div className="aspect-4/5 bg-black overflow-hidden">
                        <PropertyImage src={member.photoUrl} alt={member.name} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                      </div>
                      <div className="pt-4">
                        <h3 className="font-cormorant text-2xl sm:text-3xl">{member.name}</h3>
                        <p className="text-xs text-white/60 mt-1">{member.role}</p>
                        <span className="accent-link inline-flex items-center gap-2 text-xs mt-3">View profile <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" /></span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
                  <p className="text-sm text-white/65 leading-relaxed max-w-2xl">Residential and commercial sales, with leasing and property management overseen personally by Wendy Chia, Director &amp; Licensee.</p>
                  <button type="button" onClick={() => navigateTo('list-with-us')} className="zenu-button-outline-light shrink-0">Book an appraisal</button>
                </div>
              </div>
            </section>

            {/* 4. Full-width commercial spotlight. */}
            {!contentReady && !contentError && <div aria-hidden="true" className="min-h-[500px] bg-[#171717]" />}
            {commercialListings[0] && (
              <section className="commercial-band relative isolate overflow-hidden" aria-labelledby="commercial-heading">
                <PropertyImage src={commercialListings[0].imageUrl} alt={commercialListings[0].title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="commercial-band-scrim absolute inset-0" />
                <div className="relative max-w-[1200px] mx-auto px-6 py-20 sm:py-28 min-h-[500px] flex flex-col justify-end">
                  <div className="max-w-xl space-y-5">
                    <p className="accent-label text-xs uppercase tracking-[0.22em]">For your business · Perth commercial</p>
                    <h2 id="commercial-heading" className="font-cormorant text-5xl sm:text-6xl text-white">A place for your<br />next chapter.</h2>
                    <p className="text-sm sm:text-base font-light text-white/80 leading-relaxed max-w-lg">Sales and leasing across Perth’s commercial precincts. Local knowledge, with a broader perspective.</p>
                    <div className="flex flex-wrap gap-4 items-center pt-3">
                      <button type="button" onClick={() => navigateTo('listings', 'Commercial')} className="zenu-button inline-flex gap-2">Explore commercial <ArrowUpRight className="w-4 h-4" aria-hidden="true" /></button>
                      <button type="button" onClick={() => setSelectedProperty(commercialListings[0])} className="accent-link text-sm underline cursor-pointer">View {commercialListings[0].title}</button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-[#000000] py-20 sm:py-28 px-6">
              <div className="max-w-[1200px] mx-auto">
                {/* From our team Magazine Card */}
                {!contentReady && !contentError && <div aria-hidden="true" className="h-[340px] bg-[#171717]" />}
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
              <p className="text-xs text-white/65 font-inter">{contentReady ? `Showing ${filteredListings.length} of ${listings.length} properties across Greater Perth` : 'Explore properties across Greater Perth'}</p>
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
                      { label: 'Leased', value: 'Leased' },
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

                <span className="text-xs text-white/60 tabular-nums">{contentReady ? `${filteredListings.length} properties found` : 'Properties loading'}</span>
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
                  {[...new Set(listings.map(item => item.propertyType))].sort().map(type => <option key={type} value={type}>{type}</option>)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy={!contentReady}>
              {!contentReady && !contentError && Array.from({ length: 6 }, (_, index) => <div key={index} aria-hidden="true" className="h-[430px] bg-[#171717]" />)}
              {filteredListings.map((property) => (
                <PropertyCard key={property.id} property={property}
                  agentName={teamMembers.find((agent) => agent.id === property.agentId)?.name}
                  onSelect={setSelectedProperty} />
              ))}
              {contentReady && filteredListings.length === 0 && (
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
                    <strong>{appraisalForm.propertyAddress}</strong> has been saved. Our team will be in touch.
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
                  <EnquirySpamField />
                  {appraisalError && (
                    <p role="alert" className="text-xs text-white bg-black border border-white/40 p-3">
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

                  <div className="pt-2 flex flex-col items-center gap-3">
                    <NewsletterOptIn checked={appraisalForm.newsletterOptIn} onChange={checked=>setAppraisalForm({...appraisalForm,newsletterOptIn:checked})}/>
                    <button type="submit" disabled={appraisalBusy} className="zenu-button-outline-light px-10! disabled:opacity-50">
                      {appraisalBusy ? 'Submitting…' : 'Book an appraisal'}
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
            onBack={() => navigateTo('team')} onSelectProperty={setSelectedProperty} onSubmitEnquiry={handleAddEnquiry} />
        )}

        {/* =================================================================== */}
        {/* VIEW 5: PROPERTY VIDEOS                                             */}
        {/* =================================================================== */}
        {activePage === 'careers' && <Careers onSubmitEnquiry={handleAddEnquiry} />}
        {activePage === 'videos' && <VideoLibrary />}

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
                      {activeBlogPost.bodyHtml ? <div className="rich-document public-rich-text" dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(activeBlogPost.bodyHtml)}} /> : activeBlogPost.content.map((paragraph, idx) => (
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
        <TestimonialsCarousel key={`${activePage}:${selectedTeamMemberId || ''}:${selectedBlogPostId || ''}:${selectedCategory}`} items={testimonials} page={`${activePage}:${activePage === 'team-profile' ? selectedTeamMemberId || '' : activePage === 'blog' ? selectedBlogPostId || '' : activePage === 'listings' && selectedCategory !== 'ALL' ? selectedCategory : ''}`} />
      </main>

      {/* =================================================================== */}
      {/* FOOTER WITH GRADIENT-TO-BLACK                                       */}
      {/* =================================================================== */}
      <footer className="bg-[#000000] text-white py-20 px-6 lg:px-12">
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
                <li><button type="button" onClick={() => navigateTo('careers')} className="hover:text-white cursor-pointer">Careers</button></li>
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
      <EnquiryConfirmation receipt={enquiryReceipt} onClose={() => setEnquiryReceipt(null)} />
      <PropertyDetailModal
        property={selectedProperty}
        agents={teamMembers}
        onClose={() => setSelectedProperty(null)}
        onSubmitEnquiry={handleAddEnquiry}
      />
    </div>
  );
}
