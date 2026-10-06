import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Phone,
  Mail,
  SlidersHorizontal,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Edit3,
  Bed,
  Bath,
  Car,
} from 'lucide-react';
import {
  INITIAL_LISTINGS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_ENQUIRIES,
  BRAND_ASSETS,
  PropertyListing,
  ListingCategory,
  TeamMember,
  ClientEnquiry,
} from './data/initialData';
import { PropertyImage } from './components/PropertyImage';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { AdminDashboard } from './components/AdminDashboard';

type ActivePage =
  | 'home'
  | 'listings'
  | 'list-with-us'
  | 'team'
  | 'videos'
  | 'blog'
  | 'admin';

const STORAGE_KEY_LISTINGS = 'exceptional_re_zenu_listings_v2';
const STORAGE_KEY_ENQUIRIES = 'exceptional_re_zenu_enquiries_v2';

export default function App() {
  const [listings, setListings] = useState<PropertyListing[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LISTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return INITIAL_LISTINGS;
  });

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Hero & Directory Search Filters
  const [heroSaleMethod, setHeroSaleMethod] = useState<'Buy' | 'Lease' | 'Sold'>('Buy');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ListingCategory>('ALL');
  const [searchSuburb, setSearchSuburb] = useState('');
  const [minBeds, setMinBeds] = useState<number>(0);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('ALL');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('ALL');
  const [showAdvancedHeroFilters, setShowAdvancedHeroFilters] = useState(false);

  // Carousel pagination state for Current Listings on Homepage
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Modals & Admin Edit Hand-off
  const [selectedProperty, setSelectedProperty] = useState<PropertyListing | null>(null);
  const [adminEditingProperty, setAdminEditingProperty] = useState<PropertyListing | null>(null);

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
      localStorage.setItem(STORAGE_KEY_LISTINGS, JSON.stringify(listings));
    } catch {
      // ignore
    }
  }, [listings]);

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
    setActivePage(page);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin CRUD Handlers
  const handleAddListing = (newListing: PropertyListing) => {
    setListings((prev) => [newListing, ...prev]);
  };

  const handleUpdateListing = (updated: PropertyListing) => {
    setListings((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    if (selectedProperty?.id === updated.id) {
      setSelectedProperty(updated);
    }
  };

  const handleDeleteListing = (id: string) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
    if (selectedProperty?.id === id) {
      setSelectedProperty(null);
    }
  };

  const handleResetDemoData = () => {
    setListings(INITIAL_LISTINGS);
    setEnquiries(INITIAL_ENQUIRIES);
    localStorage.removeItem(STORAGE_KEY_LISTINGS);
    localStorage.removeItem(STORAGE_KEY_ENQUIRIES);
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

  // Filtered Listings for Directory
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

  const commercialListings = useMemo(
    () => listings.filter((l) => l.category === 'Commercial' || l.id === '2997890'),
    [listings]
  );

  // Visible cards for the Current Listings Carousel (3 per view on desktop)
  const visibleCarouselListings = useMemo(() => {
    if (listings.length === 0) return [];
    const total = listings.length;
    const items: PropertyListing[] = [];
    for (let i = 0; i < Math.min(3, total); i++) {
      items.push(listings[(carouselIndex + i) % total]);
    }
    return items;
  }, [listings, carouselIndex]);

  // Render Admin Workspace if active
  if (activePage === 'admin') {
    return (
      <>
        <AdminDashboard
          listings={listings}
          teamMembers={teamMembers}
          enquiries={enquiries}
          initialEditingProperty={adminEditingProperty}
          onClearInitialEditing={() => setAdminEditingProperty(null)}
          onAddListing={handleAddListing}
          onUpdateListing={handleUpdateListing}
          onDeleteListing={handleDeleteListing}
          onUpdateEnquiryStatus={handleUpdateEnquiryStatus}
          onResetDemoData={handleResetDemoData}
          onPreviewProperty={(prop) => setSelectedProperty(prop)}
          onExitAdmin={() => setActivePage('home')}
        />
        <PropertyDetailModal
          property={selectedProperty}
          agents={teamMembers}
          onClose={() => setSelectedProperty(null)}
          onEditInAdmin={(prop) => {
            setSelectedProperty(null);
            setAdminEditingProperty(prop);
          }}
          onSubmitEnquiry={handleAddEnquiry}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#302f2f] text-white font-montserrat">
      {/* =================================================================== */}
      {/* ORIGINAL HEADER (.layout-1712 #header-edinburgh: 70px sticky #000) */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 h-[70px] bg-[#000000] text-white px-4 lg:px-8 border-b border-white/10">
        <div className="max-w-[1440px] h-full mx-auto flex items-center justify-between gap-4">
          {/* Left Navigation Menu (Buy, Lease, List with us, Team, Property videos) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-montserrat font-light flex-1">
            {/* Buy Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('buy')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('listings', 'Residential Sale')}
                className="flex items-center gap-1 py-2 text-white hover:text-white/75 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Buy</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {openDropdown === 'buy' && (
                <div className="absolute left-0 top-full w-52 bg-[#000000] border border-[#302f2f] py-2 shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Residential Sale')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Residential for sale
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Sold')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Residential sold
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Commercial')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
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
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('listings', 'Residential Lease')}
                className="flex items-center gap-1 py-2 text-white hover:text-white/75 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Lease</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {openDropdown === 'lease' && (
                <div className="absolute left-0 top-full w-52 bg-[#000000] border border-[#302f2f] py-2 shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Residential Lease')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Residential for lease
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Commercial')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Commercial for lease
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'Leased')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Residential leased
                  </button>
                </div>
              )}
            </div>

            {/* List with us Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('list')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('list-with-us')}
                className="flex items-center gap-1 py-2 text-white hover:text-white/75 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>List with us</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {openDropdown === 'list' && (
                <div className="absolute left-0 top-full w-48 bg-[#000000] border border-[#302f2f] py-2 shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Sell with us
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Lease with us
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Build with us
                  </button>
                </div>
              )}
            </div>

            {/* Team Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setOpenDropdown('team')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => navigateTo('team')}
                className="flex items-center gap-1 py-2 text-white hover:text-white/75 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Team</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {openDropdown === 'team' && (
                <div className="absolute left-0 top-full w-48 bg-[#000000] border border-[#302f2f] py-2 shadow-xl z-50">
                  <button
                    type="button"
                    onClick={() => navigateTo('team')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    Our Team
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="w-full text-left px-4 py-2 text-xs text-white/85 hover:bg-[#302f2f] hover:text-white cursor-pointer"
                  >
                    About Us
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateTo('videos')}
              className="py-2 text-white hover:text-white/75 transition-colors cursor-pointer whitespace-nowrap"
            >
              Property videos
            </button>
          </nav>

          {/* Center: Original Exceptional Real Estate Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            className="flex items-center justify-center h-full py-2 shrink-0"
          >
            <img
              src={BRAND_ASSETS.logoLightOnDark}
              alt="Exceptional Real Estate"
              referrerPolicy="no-referrer"
              className="h-11 sm:h-12 w-auto object-contain"
            />
          </a>

          {/* Right: Admin Dashboard Button + Book Appraisal + Hamburger */}
          <div className="flex items-center justify-end gap-3 flex-1">
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className="zenu-button-outline-light text-xs! px-4! h-9! leading-9!"
            >
              Admin Dashboard ({listings.length})
            </button>
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
              aria-label="Open menu"
              className="lg:hidden p-2 text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-x-0 top-[70px] bg-[#000000] border-b border-[#302f2f] p-6 space-y-4 z-50">
            <div className="flex flex-col space-y-3 text-sm font-montserrat">
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
                Commercial Properties
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
                Our Team
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
                onClick={() => navigateTo('admin')}
                className="text-left py-2 text-white font-medium underline"
              >
                Open Admin Dashboard ({listings.length} Listings)
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        {/* =================================================================== */}
        {/* HOME VIEW — EXACT WIDGET SEQUENCE FROM EXCEPTIONALREALESTATE.COM.AU */}
        {/* =================================================================== */}
        {activePage === 'home' && (
          <div>
            {/* WIDGET 1: .widget-466794 (Hero Video + "Find your home with us" Search Bar) */}
            <section className="relative w-full h-[540px] sm:h-[650px] bg-[#000000] overflow-hidden flex items-center justify-center">
              {/* Background Vimeo Video with Poster Fallback */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img
                  src="https://images.zenu.com.au/1200/i3h8ywbdx2iifuvyw3jq1frdmgcl86ws.jpg"
                  alt="Exceptional Real Estate Background"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-55"
                />
                <iframe
                  src={BRAND_ASSETS.heroVimeoEmbed}
                  title="Exceptional Real Estate Hero Video"
                  className="absolute top-1/2 left-1/2 w-[177.77vh] min-w-full min-h-full h-[56.25vw] -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none"
                  allow="autoplay; fullscreen"
                />
              </div>
              <div className="absolute inset-0 bg-black/45 z-10" />

              {/* Form Container */}
              <div className="relative z-20 w-full max-w-[920px] px-4 text-center">
                <h1 className="font-cormorant text-[34px] sm:text-[42px] leading-[1.4] font-extralight text-white mb-8">
                  Find your home with us
                </h1>

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
                  className="w-full"
                >
                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    {/* Left Search Bar Container */}
                    <div className="flex-1 flex items-center bg-black/65 backdrop-blur-xs border border-white/40 h-11 px-2">
                      {/* Buy / Lease Selector */}
                      <div className="relative border-r border-[#fafafa]/60 pr-2 mr-3">
                        <select
                          aria-label="Sale or Lease method"
                          value={heroSaleMethod}
                          onChange={(e) =>
                            setHeroSaleMethod(e.target.value as 'Buy' | 'Lease' | 'Sold')
                          }
                          className="bg-transparent text-white font-inter text-sm font-light px-3 py-1 focus:outline-none cursor-pointer"
                        >
                          <option value="Buy" className="bg-black text-white">
                            Buy
                          </option>
                          <option value="Lease" className="bg-black text-white">
                            Lease
                          </option>
                          <option value="Sold" className="bg-black text-white">
                            Sold
                          </option>
                        </select>
                      </div>

                      {/* Suburb / Address Input */}
                      <input
                        type="text"
                        value={searchSuburb}
                        onChange={(e) => setSearchSuburb(e.target.value)}
                        placeholder="Address, Suburb and Postcode"
                        className="flex-1 bg-transparent text-white placeholder:text-white/85 text-sm font-montserrat font-light focus:outline-none px-2"
                      />

                      {/* Filter Toggle Icon Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setShowAdvancedHeroFilters(!showAdvancedHeroFilters)
                        }
                        title="Open search filters"
                        aria-label="Open search filters"
                        className="px-3 text-white/85 hover:text-white cursor-pointer"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Right Search Submit Pill Button */}
                    <button
                      type="submit"
                      className="zenu-button h-11! px-8! border-white/30"
                    >
                      Search
                    </button>
                  </div>

                  {/* Expandable Filter Drawer inside Hero */}
                  {showAdvancedHeroFilters && (
                    <div className="mt-3 p-4 bg-black/85 border border-white/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                      <div>
                        <label className="block text-xs text-white/70 mb-1">
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
                        <label className="block text-xs text-white/70 mb-1">
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
                        <label className="block text-xs text-white/70 mb-1">
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
                    </div>
                  )}
                </form>
              </div>
            </section>

            {/* WIDGET 2: .widget-466796 ("CURRENT LISTINGS" on #000000 Section Background with 500px Overlay Cards) */}
            <section className="bg-[#000000] py-16 px-4 sm:px-8">
              <div className="max-w-[1100px] mx-auto">
                {/* Top Heading */}
                <div className="pb-6 text-center">
                  <h2 className="font-cormorant text-[24px] leading-[36px] font-extralight text-white tracking-wider uppercase">
                    CURRENT LISTINGS
                  </h2>
                </div>

                {/* Carousel Arrows (Matches .splide__arrows) */}
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselIndex((prev) =>
                          prev === 0 ? Math.max(0, listings.length - 1) : prev - 1
                        )
                      }
                      aria-label="Previous listing"
                      className="w-7 h-7 rounded-full bg-[#9e9e9e] hover:bg-[#2b2b2b] text-black hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselIndex((prev) => (prev + 1) % listings.length)
                      }
                      aria-label="Next listing"
                      className="w-7 h-7 rounded-full bg-[#9e9e9e] hover:bg-[#2b2b2b] text-black hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo('listings', 'ALL')}
                    className="text-xs font-inter text-white/80 hover:text-white underline cursor-pointer"
                  >
                    View All {listings.length} Listings
                  </button>
                </div>

                {/* 3-Card Splide Track (.card-10669: 500px tall full-bleed image cards with centered text) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {visibleCarouselListings.map((property) => (
                    <div
                      key={property.id}
                      onClick={() => setSelectedProperty(property)}
                      className="group relative h-[480px] bg-white overflow-hidden isolation-isolate cursor-pointer border border-white/10"
                    >
                      {/* Full-bleed Background Image */}
                      <div className="absolute inset-0 z-10 overflow-hidden">
                        <PropertyImage
                          src={property.imageUrl}
                          alt={property.title}
                          fallbackLabel={property.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Scrim Overlay (rgba(0,0,0,0.25) -> rgba(0,0,0,0.48) on hover) */}
                      <div className="absolute inset-0 z-20 bg-black/30 group-hover:bg-black/50 transition-colors duration-300" />

                      {/* Top-left "Just Listed" Badge */}
                      {property.badgeText && (
                        <div className="absolute top-4 left-4 z-30 bg-black/80 text-white text-xs font-montserrat px-3 py-1">
                          {property.badgeText}
                        </div>
                      )}

                      {/* Centered Details Overlay */}
                      <div className="relative z-30 h-full flex flex-col items-center justify-center text-center px-6 py-8 text-white">
                        <div className="font-manrope text-[24px] sm:text-[26px] leading-[1.35] font-normal text-white drop-shadow-xs">
                          {property.title}
                        </div>
                        <div className="font-cormorant text-[20px] sm:text-[22px] leading-[1.4] font-light text-white/95 mt-1 group-hover:pb-3 transition-all">
                          {property.suburb}
                        </div>
                        <div className="font-montserrat text-sm font-light text-white/95 mt-2 tracking-wide">
                          {property.priceDisplay}
                        </div>

                        {/* Hover Reveal Attributes */}
                        <div className="mt-4 opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-xs text-white/90 font-montserrat">
                          {property.bedrooms > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5" />
                              {property.bedrooms}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Bath className="w-3.5 h-3.5" />
                            {property.bathrooms}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Car className="w-3.5 h-3.5" />
                            {property.carSpaces}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Dots */}
                <div className="flex items-center justify-center gap-2 pt-6">
                  {listings.slice(0, 8).map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCarouselIndex(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`h-2.5 w-2.5 transition-colors cursor-pointer ${
                        carouselIndex % listings.length === idx
                          ? 'bg-white'
                          : 'bg-[#9e9e9e]/50 hover:bg-[#9e9e9e]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* WIDGET 3: .widget-466799 ("Every side of property, one Perth team." on #ffffff background) */}
            <section className="bg-[#ffffff] text-[#000000] py-16 px-4 sm:px-8">
              <div className="max-w-[900px] mx-auto text-center">
                <h2 className="font-roboto text-[30px] sm:text-[36px] leading-[1.45] font-medium text-[#000000]">
                  Every side of property, one Perth team.
                </h2>
                <p className="font-montserrat text-[17px] leading-[25.5px] font-light text-[#000000] mt-3">
                  Residential and commercial sales, leasing and property management - based in Applecross.
                </p>
                <div className="pt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="zenu-button"
                  >
                    Book an appraisal
                  </button>
                </div>
              </div>
            </section>

            {/* WIDGET 4: .widget-466800 ("How we can help" Fieldset Box with 1px solid #000000 border on #ffffff) */}
            <section className="bg-[#ffffff] text-[#000000] pb-16 px-6 sm:px-[15%] lg:px-[20%]">
              <div className="max-w-[1000px] mx-auto">
                <fieldset className="w-full border border-[#000000] bg-[#ffffff] px-6 py-8 text-center">
                  <legend className="px-4 mx-auto font-roboto text-xl sm:text-2xl font-medium text-[#000000] text-center">
                    How we can help
                  </legend>
                  <p className="max-w-[75%] mx-auto py-4 font-montserrat text-[16px] sm:text-[17px] leading-[25.5px] font-light text-[#000000]">
                    Residential and commercial sales are handled by our sales team, leasing and property management are overseen personally by Wendy Chia (Director &amp; Licensee, Licence No. RA84388), and select properties are also available off-market with details shared privately on request.
                  </p>
                </fieldset>

                <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
                  <a
                    href="https://www.instagram.com/wendychiarealty/"
                    target="_blank"
                    rel="noreferrer"
                    className="zenu-button"
                  >
                    DM to enquire
                  </a>
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="zenu-button"
                  >
                    Book an appraisal
                  </button>
                </div>
              </div>
            </section>

            {/* WIDGET 5: .widget-466891 (Full-width 16:9 Banner Image) */}
            <section className="w-full bg-[#302f2f]">
              <div className="w-full aspect-16/9 max-h-[680px] overflow-hidden">
                <PropertyImage
                  src={BRAND_ASSETS.teamBannerImage}
                  alt="Exceptional Real Estate Applecross Team"
                  className="w-full h-full object-cover"
                />
              </div>
            </section>

            {/* WIDGET 6: .widget-466795 ("Meet the Team" on #302f2f Page Background with .card-10664 Black Cards) */}
            <section className="bg-[#302f2f] py-20 px-4 sm:px-8">
              <div className="max-w-[1100px] mx-auto">
                <div className="text-center mb-10">
                  <h2 className="font-cormorant text-[36px] sm:text-[42px] leading-[1.4] font-bold text-white">
                    Meet the Team
                  </h2>
                  <p className="font-montserrat text-[14px] font-bold text-[#efeee9] mt-1">
                    Sales and property management sit with different people, on purpose.
                  </p>
                </div>

                {/* 3-Column Agent Cards (.card-10664: border 1px solid #c6c6c6, background #000000) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border border-[#c6c6c6] bg-[#000000] flex flex-col h-full overflow-hidden"
                    >
                      {/* Portrait Image (min-h-[384px]) */}
                      <div
                        onClick={() => {
                          setSelectedAgentFilter(member.id);
                          navigateTo('listings', 'ALL');
                        }}
                        className="relative min-h-[384px] w-full overflow-hidden bg-[#1a1a1a] cursor-pointer group"
                      >
                        <PropertyImage
                          src={member.photoUrl}
                          alt={member.name}
                          fallbackLabel={member.name}
                          className="w-full h-full object-cover object-top absolute inset-0 group-hover:scale-103 transition-transform duration-300"
                        />
                      </div>

                      {/* Agent Details */}
                      <div className="px-5 pt-6 flex-1 flex flex-col justify-between">
                        <div>
                          <button
                            type="button"
                            onClick={() => navigateTo('team')}
                            className="font-cormorant text-[26px] leading-[1.3] font-light text-white hover:underline block mb-4 text-left cursor-pointer"
                          >
                            {member.name}
                          </button>
                          <div className="font-montserrat text-sm font-light text-white/85">
                            {member.role}
                          </div>
                        </div>

                        <div className="mt-5 pt-6 pb-6 border-t border-white/15 flex items-center justify-between text-xs text-white font-montserrat">
                          <a
                            href={`mailto:${member.email}`}
                            className="flex items-center gap-2 hover:text-white/75 transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email Agent</span>
                          </a>
                          <a
                            href={`tel:${member.phone.replace(/\s+/g, '')}`}
                            className="flex items-center gap-2 hover:text-white/75 transition-colors tabular-nums"
                          >
                            <Phone className="w-4 h-4" />
                            <span>{member.phone}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* WIDGET 7: .widget-466798 ("Commercial Properties" on #ffffff Background) */}
            <section className="bg-[#ffffff] text-[#000000] py-16 px-4 sm:px-8">
              <div className="max-w-[1200px] mx-auto">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Left 25%: Text */}
                  <div className="w-full lg:w-1/4 space-y-3">
                    <h2 className="font-roboto text-[32px] sm:text-[35px] leading-[1.35] font-medium text-[#000000]">
                      Commercial Properties
                    </h2>
                    <p className="font-montserrat text-base text-[#000000] font-light">
                      Sales and leasing across Perth&apos;s commercial precincts.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('listings', 'Commercial')}
                        className="zenu-button"
                      >
                        View Commercial
                      </button>
                    </div>
                  </div>

                  {/* Right 75%: Commercial Slideshow Card */}
                  <div className="w-full lg:w-3/4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {commercialListings.map((prop) => (
                        <div
                          key={prop.id}
                          onClick={() => setSelectedProperty(prop)}
                          className="group relative h-[420px] bg-black overflow-hidden cursor-pointer"
                        >
                          <PropertyImage
                            src={prop.imageUrl}
                            alt={prop.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/35 group-hover:bg-black/50 transition-colors" />
                          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6 text-white">
                            <div className="font-manrope text-2xl font-normal">
                              {prop.title}
                            </div>
                            <div className="font-cormorant text-xl font-light mt-1">
                              {prop.suburb}
                            </div>
                            <div className="font-montserrat text-sm font-light mt-2">
                              {prop.priceDisplay}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* WIDGET 8: .widget-466797 ("Latest News" on #302f2f with #000000 Content Grid) */}
            <section className="bg-[#302f2f] py-16 px-4 sm:px-8">
              <div className="max-w-[1100px] mx-auto">
                <h2 className="font-roboto text-[32px] sm:text-[36px] leading-[54px] font-extrabold text-black mb-8">
                  Latest News
                </h2>

                <div className="bg-[#000000] grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
                  <div className="lg:col-span-3">
                    <PropertyImage
                      src={BRAND_ASSETS.blogMay2026Image}
                      alt="Perth Property Market — May 2026"
                      className="w-full h-full object-cover min-h-[320px]"
                    />
                  </div>
                  <div className="lg:col-span-2 p-8 sm:p-10 flex flex-col justify-center text-center">
                    <h3 className="font-cormorant text-2xl sm:text-3xl font-light text-white mb-4">
                      Perth Property Market — May 2026
                    </h3>
                    <p className="font-montserrat text-sm sm:text-base font-light text-white/85 leading-relaxed mb-8">
                      Perth’s property market continues to outperform the nation, with rising values, strong buyer demand, and historically low supply creating a rare opportunity for homeowners. In a market defined by speed and competition, exceptional results are increasingly achieved through considered strategy, refined presentation, and expert positioning. Explore the key trends shaping Perth in May 2026 and what they could mean for your next move.
                    </p>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => navigateTo('blog')}
                        className="zenu-button-outline-light"
                      >
                        READ MORE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 2: PROPERTIES DIRECTORY (BUY / LEASE / COMMERCIAL / SOLD)      */}
        {/* =================================================================== */}
        {activePage === 'listings' && (
          <section className="py-14 px-4 sm:px-8 max-w-[1200px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/15">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/60">
                  Exceptional Real Estate Portfolio
                </p>
                <h1 className="font-cormorant text-4xl sm:text-5xl font-extralight text-white mt-1">
                  {selectedCategory === 'ALL' ? 'Current Listings' : selectedCategory}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => navigateTo('admin')}
                className="zenu-button-outline-light gap-2 self-start md:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Manage Listings in Admin
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#000000] border border-[#c6c6c6]/30 p-5 space-y-4">
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
                          : 'bg-black text-white/80 border-white/25 hover:border-white'
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#302f2f]">
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

            {/* Grid of Original .card-10669 Overlay Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((property) => (
                <div
                  key={property.id}
                  onClick={() => setSelectedProperty(property)}
                  className="group relative h-[460px] bg-black overflow-hidden cursor-pointer border border-[#c6c6c6]/25"
                >
                  <div className="absolute inset-0 z-10">
                    <PropertyImage
                      src={property.imageUrl}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute inset-0 z-20 bg-black/35 group-hover:bg-black/55 transition-colors" />

                  {property.badgeText && (
                    <div className="absolute top-4 left-4 z-30 bg-black/85 text-white text-xs px-3 py-1">
                      {property.badgeText}
                    </div>
                  )}

                  <div className="relative z-30 h-full flex flex-col items-center justify-center text-center px-6 text-white">
                    <div className="font-manrope text-2xl font-normal">
                      {property.title}
                    </div>
                    <div className="font-cormorant text-xl font-light mt-1">
                      {property.suburb}
                    </div>
                    <div className="font-montserrat text-sm font-light mt-2">
                      {property.priceDisplay}
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-white/85">
                      {property.bedrooms > 0 && <span>{property.bedrooms} Bed</span>}
                      <span>{property.bathrooms} Bath</span>
                      <span>{property.carSpaces} Car</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* VIEW 3: LIST WITH US / BOOK AN APPRAISAL                            */}
        {/* =================================================================== */}
        {activePage === 'list-with-us' && (
          <div>
            <section className="bg-[#ffffff] text-[#000000] py-16 px-4 sm:px-8">
              <div className="max-w-[960px] mx-auto text-center space-y-4">
                <h1 className="font-roboto text-3xl sm:text-4xl font-medium text-black">
                  Every side of property, one Perth team.
                </h1>
                <p className="font-montserrat text-base sm:text-lg font-light text-black max-w-2xl mx-auto">
                  Residential and commercial sales are handled by our sales team, leasing and property management are overseen personally by Wendy Chia (Director &amp; Licensee, Licence No. RA84388), and select properties are also available off-market.
                </p>
              </div>
            </section>

            <section className="bg-[#302f2f] py-16 px-4 sm:px-8">
              <div className="max-w-[820px] mx-auto bg-[#000000] border border-[#c6c6c6] p-8 sm:p-12">
                <h2 className="font-cormorant text-3xl sm:text-4xl font-light text-white text-center">
                  Book an Appraisal
                </h2>
                <p className="text-center text-xs text-white/70 mt-2 font-montserrat">
                  2/28 Kintail Road, Applecross 6153 · Personalised guidance. Results that speak.
                </p>

                {appraisalSubmitted ? (
                  <div className="mt-8 p-6 bg-[#302f2f] border border-white text-center space-y-4">
                    <div className="inline-flex items-center gap-2 text-white font-medium">
                      <Check className="w-5 h-5" />
                      <span>Appraisal Request Received</span>
                    </div>
                    <p className="text-xs text-white/85 leading-relaxed max-w-lg mx-auto">
                      Thank you, {appraisalForm.fullName}. Your request for{' '}
                      <strong>{appraisalForm.propertyAddress}</strong> has been logged and is visible in the{' '}
                      <button
                        type="button"
                        onClick={() => navigateTo('admin')}
                        className="underline font-medium cursor-pointer"
                      >
                        Admin Dashboard
                      </button>
                      .
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
                      className="w-full p-3 font-poppins text-sm text-[#363636] bg-[#ededed] border border-[#f7f9fa]"
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
          </div>
        )}

        {/* =================================================================== */}
        {/* VIEW 4: MEET THE TEAM                                               */}
        {/* =================================================================== */}
        {activePage === 'team' && (
          <section className="bg-[#302f2f] py-16 px-4 sm:px-8">
            <div className="max-w-[1100px] mx-auto">
              <div className="text-center mb-12">
                <h1 className="font-cormorant text-[42px] leading-[63px] font-bold text-white">
                  Meet the Team
                </h1>
                <p className="font-montserrat text-[14px] font-bold text-[#efeee9]">
                  Sales and property management sit with different people, on purpose.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="border border-[#c6c6c6] bg-[#000000] flex flex-col h-full overflow-hidden"
                  >
                    <div className="relative min-h-[384px] w-full overflow-hidden bg-[#1a1a1a]">
                      <PropertyImage
                        src={member.photoUrl}
                        alt={member.name}
                        className="w-full h-full object-cover object-top absolute inset-0"
                      />
                    </div>
                    <div className="px-5 pt-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h2 className="font-cormorant text-[26px] font-light text-white mb-2">
                          {member.name}
                        </h2>
                        <div className="font-montserrat text-sm font-light text-white/80 mb-3">
                          {member.role}
                        </div>
                        <p className="text-xs text-white/70 font-light leading-relaxed">
                          {member.bio}
                        </p>
                      </div>
                      <div className="mt-5 pt-6 pb-6 border-t border-white/15 flex items-center justify-between text-xs text-white">
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
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* VIEW 5: PROPERTY VIDEOS                                             */}
        {/* =================================================================== */}
        {activePage === 'videos' && (
          <section className="bg-[#302f2f] py-16 px-4 sm:px-8">
            <div className="max-w-[1100px] mx-auto space-y-8">
              <div className="text-center">
                <h1 className="font-cormorant text-4xl sm:text-5xl font-light text-white">
                  Property Videos
                </h1>
                <p className="text-sm text-white/75 mt-2">
                  Cinematic property showcases across Applecross and Greater Perth.
                </p>
              </div>

              <div className="aspect-16/9 w-full bg-black border border-[#c6c6c6]/40 overflow-hidden">
                <iframe
                  src="https://player.vimeo.com/video/1097764829?badge=0&autopause=0&player_id=0&app_id=58479"
                  title="Exceptional Real Estate Property Showcase"
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                />
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* VIEW 6: BLOG ARTICLE (PERTH PROPERTY MARKET — MAY 2026)             */}
        {/* =================================================================== */}
        {activePage === 'blog' && (
          <section className="bg-[#302f2f] py-16 px-4 sm:px-8">
            <div className="max-w-[900px] mx-auto bg-[#000000] border border-[#c6c6c6]/30 overflow-hidden">
              <div className="aspect-16/9 w-full">
                <PropertyImage
                  src={BRAND_ASSETS.blogMay2026Image}
                  alt="Perth Property Market — May 2026"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-8 sm:p-12 space-y-6">
                <h1 className="font-cormorant text-3xl sm:text-5xl font-light text-white">
                  Perth Property Market — May 2026
                </h1>
                <p className="text-white/85 font-montserrat font-light leading-relaxed">
                  Perth’s property market continues to outperform the nation, with rising values, strong buyer demand, and historically low supply creating a rare opportunity for homeowners. In a market defined by speed and competition, exceptional results are increasingly achieved through considered strategy, refined presentation, and expert positioning.
                </p>
                <p className="text-white/85 font-montserrat font-light leading-relaxed">
                  Whether you are considering selling a family residence, leasing an investment property under the personal supervision of Wendy Chia (Director &amp; Licensee, Licence No. RA84388), or exploring off-market opportunities in Applecross, our team is ready to assist.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => navigateTo('list-with-us')}
                    className="zenu-button-outline-light"
                  >
                    Book an appraisal
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* =================================================================== */}
      {/* ORIGINAL FOOTER (.layout-1713: #000000 Background)                  */}
      {/* =================================================================== */}
      <footer className="bg-[#000000] text-white py-16 px-6 lg:px-12 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-sm font-montserrat font-light">
            {/* Column 1: Office Address */}
            <div>
              <div className="flex items-center gap-2 font-normal text-white mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>2/28 Kintail Road, Applecross 6153</span>
              </div>
            </div>

            {/* Column 2: Sell */}
            <div>
              <div className="flex items-center gap-2 font-normal text-white mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>Sell</span>
              </div>
              <ul className="space-y-2 pl-4 text-white/80 text-xs">
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
              <ul className="space-y-2 pl-4 text-white/80 text-xs">
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

            {/* Column 4: Team */}
            <div>
              <div className="flex items-center gap-2 font-normal text-white mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>Team</span>
              </div>
              <ul className="space-y-2 pl-4 text-white/80 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('team')}
                    className="hover:text-white cursor-pointer"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('admin')}
                    className="hover:text-white underline cursor-pointer"
                  >
                    Admin Dashboard
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 5: Social Links */}
            <div className="flex lg:justify-end items-start gap-4">
              <a
                href="https://www.instagram.com/exceptionalrealestate/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white/80 hover:text-white border border-white/30 px-3 py-1.5 rounded-full"
              >
                Instagram
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61577338962576"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-white/80 hover:text-white border border-white/30 px-3 py-1.5 rounded-full"
              >
                Facebook
              </a>
            </div>
          </div>

          {/* Legal Links */}
          <div className="pt-12 flex flex-wrap items-center justify-center gap-3 text-xs text-white/70">
            <span>Designed &amp; Powered by Zenu</span>
            <span>|</span>
            <button
              type="button"
              onClick={() => navigateTo('list-with-us')}
              className="hover:text-white cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      {/* PROPERTY DETAIL & ENQUIRY MODAL */}
      <PropertyDetailModal
        property={selectedProperty}
        agents={teamMembers}
        onClose={() => setSelectedProperty(null)}
        onEditInAdmin={(prop) => {
          setAdminEditingProperty(prop);
          setActivePage('admin');
        }}
        onSubmitEnquiry={handleAddEnquiry}
      />
    </div>
  );
}
