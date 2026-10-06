import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  RotateCcw,
  Building2,
  Users,
  Inbox,
  ArrowUpRight,
  Star,
} from 'lucide-react';
import {
  PropertyListing,
  ListingCategory,
  ListingStatus,
  TeamMember,
  ClientEnquiry,
  BRAND_ASSETS,
} from '../data/initialData';
import { PropertyImage } from './PropertyImage';

interface AdminDashboardProps {
  listings: PropertyListing[];
  teamMembers: TeamMember[];
  enquiries: ClientEnquiry[];
  initialEditingProperty: PropertyListing | null;
  onClearInitialEditing: () => void;
  onAddListing: (listing: PropertyListing) => void;
  onUpdateListing: (listing: PropertyListing) => void;
  onDeleteListing: (id: string) => void;
  onUpdateEnquiryStatus: (id: string, status: ClientEnquiry['status']) => void;
  onResetDemoData: () => void;
  onPreviewProperty: (property: PropertyListing) => void;
  onExitAdmin: () => void;
}

const PRESET_IMAGES = [
  {
    label: '14A Sill Street, Bentley',
    url: 'https://images.zenu.com.au/600-min/p1jghjdajuju3e1j0u8hps6yc56fpz9c.jpg',
  },
  {
    label: '15/193 Hay St, East Perth',
    url: 'https://images.zenu.com.au/600-min/x7938ynr0bbgjrmlw5sfw23e4o57us2t.jpg',
  },
  {
    label: '26D Matheson Rd, Applecross',
    url: 'https://images.zenu.com.au/s1mtf0lnpl5qwf0f4jcoe0tygnh3ismw.png',
  },
  {
    label: '893 Canning Hwy, Applecross',
    url: 'https://images.zenu.com.au/d5b1ykdixa3hlcejc5m79vlmgwnpy4pg.png',
  },
  {
    label: 'C/344 Coode St, Dianella',
    url: 'https://images.zenu.com.au/600-min/osjwog8lnmhx1v2gmlu21ehj9tqttr2d.jpg',
  },
];

const EMPTY_FORM: Omit<PropertyListing, 'id'> = {
  title: '',
  address: '',
  suburb: 'Applecross',
  state: 'WA',
  postcode: '6153',
  priceDisplay: '',
  numericPrice: 950000,
  category: 'Residential Sale',
  status: 'Available',
  badgeText: 'Just Listed',
  propertyType: 'House',
  bedrooms: 4,
  bathrooms: 2,
  carSpaces: 2,
  landSizeSqm: 480,
  buildingAreaSqm: 240,
  imageUrl: 'https://images.zenu.com.au/600-min/p1jghjdajuju3e1j0u8hps6yc56fpz9c.jpg',
  agentId: 'agent-wendy-chia',
  coAgentId: 'agent-calvin-liew',
  featured: true,
  inspectionTime: 'Saturday 11:00 AM – 11:45 AM',
  headline: '',
  description: '',
  features: [
    'Spacious open-plan living and dining zone',
    'Stone kitchen benchtops with quality appliances',
    'Secure double garage and landscaped courtyard',
  ],
  listedDate: new Date().toISOString().split('T')[0],
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  listings,
  teamMembers,
  enquiries,
  initialEditingProperty,
  onClearInitialEditing,
  onAddListing,
  onUpdateListing,
  onDeleteListing,
  onUpdateEnquiryStatus,
  onResetDemoData,
  onPreviewProperty,
  onExitAdmin,
}) => {
  const [activeSection, setActiveSection] = useState<'inventory' | 'editor' | 'enquiries' | 'agents'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Omit<PropertyListing, 'id'>>(EMPTY_FORM);
  const [featuresText, setFeaturesText] = useState(EMPTY_FORM.features.join('\n'));
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (initialEditingProperty) {
      startEditProperty(initialEditingProperty);
      onClearInitialEditing();
    }
  }, [initialEditingProperty]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const startCreateNew = () => {
    setEditingId(null);
    setFormState(EMPTY_FORM);
    setFeaturesText(EMPTY_FORM.features.join('\n'));
    setActiveSection('editor');
  };

  const startEditProperty = (prop: PropertyListing) => {
    setEditingId(prop.id);
    const { id, ...rest } = prop;
    setFormState(rest);
    setFeaturesText(prop.features.join('\n'));
    setActiveSection('editor');
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.address.trim() || !formState.priceDisplay.trim()) {
      showToast('Please complete Street Title, Full Address, and Price Display.');
      return;
    }

    const parsedFeatures = featuresText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (editingId) {
      const updated: PropertyListing = {
        id: editingId,
        ...formState,
        features: parsedFeatures.length > 0 ? parsedFeatures : ['Prime Western Australian property'],
      };
      onUpdateListing(updated);
      showToast(`Updated listing: ${updated.title}`);
    } else {
      const newListing: PropertyListing = {
        id: `${Date.now().toString().slice(-7)}`,
        ...formState,
        features: parsedFeatures.length > 0 ? parsedFeatures : ['Prime Western Australian property'],
      };
      onAddListing(newListing);
      showToast(`Published new listing: ${newListing.title}`);
    }
    setActiveSection('inventory');
  };

  const handleQuickStatusChange = (prop: PropertyListing, newStatus: ListingStatus) => {
    let updatedCategory: ListingCategory = prop.category;
    if (newStatus === 'Sold') updatedCategory = 'Sold';
    if (newStatus === 'Leased') updatedCategory = 'Leased';
    if (newStatus === 'Available' && prop.category === 'Sold') updatedCategory = 'Residential Sale';

    onUpdateListing({
      ...prop,
      status: newStatus,
      category: updatedCategory,
      soldDate: newStatus === 'Sold' ? new Date().toISOString().split('T')[0] : prop.soldDate,
    });
    showToast(`Status updated to ${newStatus} for ${prop.title}`);
  };

  const handleToggleFeatured = (prop: PropertyListing) => {
    onUpdateListing({
      ...prop,
      featured: !prop.featured,
    });
    showToast(
      !prop.featured
        ? `${prop.title} added to Current Listings carousel`
        : `${prop.title} removed from featured highlight`
    );
  };

  const filteredListings = listings.filter((item) => {
    const matchesCategory =
      categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const activeSaleCount = listings.filter((l) => l.category === 'Residential Sale').length;
  const activeLeaseCount = listings.filter(
    (l) => l.category === 'Residential Lease' || l.category === 'Commercial'
  ).length;
  const soldPortfolioCount = listings.filter((l) => l.category === 'Sold').length;
  const unreadEnquiriesCount = enquiries.filter((e) => e.status === 'New').length;

  return (
    <div className="min-h-screen bg-[#302f2f] text-white flex flex-col lg:flex-row font-montserrat">
      {/* Left Sidebar Navigation (#000000 Section Background) */}
      <aside className="w-full lg:w-64 bg-[#000000] text-white shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#c6c6c6]/25">
        <div className="p-6">
          <div className="pb-6 border-b border-[#302f2f]">
            <img
              src={BRAND_ASSETS.logoLightOnDark}
              alt="Exceptional Real Estate"
              referrerPolicy="no-referrer"
              className="h-10 object-contain mb-3"
            />
            <p className="text-xs text-white/60">
              Admin Management Portal
            </p>
          </div>

          <nav className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => setActiveSection('inventory')}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
                activeSection === 'inventory'
                  ? 'bg-white text-black border-white font-medium'
                  : 'text-white/80 border-transparent hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4" />
                Current Listings
              </span>
              <span className="tabular-nums">{listings.length}</span>
            </button>

            <button
              type="button"
              onClick={startCreateNew}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
                activeSection === 'editor'
                  ? 'bg-white text-black border-white font-medium'
                  : 'text-white/80 border-transparent hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Plus className="w-4 h-4" />
                {editingId ? 'Edit Listing' : 'Add New Listing'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('enquiries')}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
                activeSection === 'enquiries'
                  ? 'bg-white text-black border-white font-medium'
                  : 'text-white/80 border-transparent hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4" />
                Enquiries & Appraisals
              </span>
              <span className="tabular-nums">
                {unreadEnquiriesCount > 0 ? `${unreadEnquiriesCount} new` : enquiries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('agents')}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-inter rounded-full border transition-colors cursor-pointer ${
                activeSection === 'agents'
                  ? 'bg-white text-black border-white font-medium'
                  : 'text-white/80 border-transparent hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                Team Members
              </span>
              <span className="tabular-nums">{teamMembers.length}</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-[#302f2f] space-y-3">
          <button
            type="button"
            onClick={() => {
              onResetDemoData();
              showToast('Restored original website listings.');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-inter text-white/80 hover:text-white border border-white/30 rounded-full hover:border-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Original Listings
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-inter font-medium bg-white text-black rounded-full hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            Back to Website
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-[#000000] border-b border-[#c6c6c6]/25 px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span>Exceptional Real Estate</span>
            <span>/</span>
            <span className="font-medium text-white">
              {activeSection === 'inventory' && 'Property Listings Management'}
              {activeSection === 'editor' &&
                (editingId ? `Editing: ${formState.title}` : 'Add New Property Listing')}
              {activeSection === 'enquiries' && 'Submitted Appraisals & Enquiries'}
              {activeSection === 'agents' && 'Team Directory'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {toastMessage && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs rounded-full">
                <Check className="w-3.5 h-3.5" />
                <span>{toastMessage}</span>
              </div>
            )}
            <button
              type="button"
              onClick={startCreateNew}
              className="zenu-button-outline-light gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Listing
            </button>
          </div>
        </header>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-[#000000] border-b border-[#c6c6c6]/25 divide-y sm:divide-y-0 sm:divide-x divide-[#302f2f]">
          <div className="px-6 py-4">
            <p className="text-xs text-white/60">Residential For Sale</p>
            <p className="text-2xl font-cormorant text-white tabular-nums mt-1">
              {activeSaleCount}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-white/60">For Lease & Commercial</p>
            <p className="text-2xl font-cormorant text-white tabular-nums mt-1">
              {activeLeaseCount}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-white/60">Sold Listings</p>
            <p className="text-2xl font-cormorant text-white tabular-nums mt-1">
              {soldPortfolioCount}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-xs text-white/60">Client Enquiries</p>
            <p className="text-2xl font-cormorant text-white tabular-nums mt-1">
              {enquiries.length}
            </p>
          </div>
        </div>

        {/* Main Viewport Body */}
        <main className="p-6 sm:p-8 flex-1">
          {/* SECTION 1: INVENTORY TABLE */}
          {activeSection === 'inventory' && (
            <div className="space-y-6 max-w-[1200px] mx-auto">
              {/* Filter & Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#000000] p-4 border border-[#c6c6c6]/30">
                <div className="flex flex-wrap items-center gap-2">
                  {(['ALL', 'Residential Sale', 'Residential Lease', 'Commercial', 'Sold'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3.5 py-1.5 text-xs font-inter rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                          categoryFilter === cat
                            ? 'bg-white text-black border-white font-medium'
                            : 'text-white/70 border-[#302f2f] hover:border-white/50'
                        }`}
                      >
                        {cat === 'ALL' ? 'All Listings' : cat}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by street or suburb..."
                    className="zenu-input w-full pl-9!"
                  />
                </div>
              </div>

              {/* Data Grid */}
              <div className="bg-[#000000] border border-[#c6c6c6]/30 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#302f2f] text-[11px] font-medium text-white/60 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Property</th>
                      <th className="py-3.5 px-4">Suburb</th>
                      <th className="py-3.5 px-4">Category & Status</th>
                      <th className="py-3.5 px-4 text-right">Price Guide</th>
                      <th className="py-3.5 px-4">Badge</th>
                      <th className="py-3.5 px-4">Lead Agent</th>
                      <th className="py-3.5 px-4 text-center">Carousel</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#302f2f] text-xs">
                    {filteredListings.map((prop) => {
                      const agent = teamMembers.find((a) => a.id === prop.agentId);
                      return (
                        <tr
                          key={prop.id}
                          className="hover:bg-[#302f2f]/50 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-11 bg-[#302f2f] shrink-0 overflow-hidden border border-[#c6c6c6]/30">
                                <PropertyImage
                                  src={prop.imageUrl}
                                  alt={prop.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => onPreviewProperty(prop)}
                                  className="font-medium text-white hover:underline text-left cursor-pointer text-sm"
                                >
                                  {prop.title}
                                </button>
                                <p className="text-[11px] text-white/60 truncate max-w-xs">
                                  {prop.address}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-white/80 whitespace-nowrap">
                            {prop.suburb}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="text-white/60">{prop.category}</span>
                              <select
                                aria-label={`Status for ${prop.title}`}
                                value={prop.status}
                                onChange={(e) =>
                                  handleQuickStatusChange(
                                    prop,
                                    e.target.value as ListingStatus
                                  )
                                }
                                className="text-xs bg-[#302f2f] border border-[#c6c6c6]/40 px-2 py-1 text-white focus:outline-none w-fit"
                              >
                                <option value="Available">Available</option>
                                <option value="Under Offer">Under Offer</option>
                                <option value="Sold">Sold</option>
                                <option value="Leased">Leased</option>
                                <option value="Off-Market">Off-Market</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right tabular-nums font-medium text-white whitespace-nowrap">
                            {prop.priceDisplay}
                          </td>
                          <td className="py-3.5 px-4 text-white/80 whitespace-nowrap">
                            {prop.badgeText || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-white/80 whitespace-nowrap">
                            {agent ? agent.name : 'Wendy Chia'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(prop)}
                              title="Toggle homepage carousel highlight"
                              className={`p-1.5 transition-colors cursor-pointer ${
                                prop.featured
                                  ? 'text-white'
                                  : 'text-white/25 hover:text-white/60'
                              }`}
                            >
                              <Star
                                className="w-4 h-4"
                                fill={prop.featured ? '#ffffff' : 'none'}
                              />
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {confirmDeleteId === prop.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteListing(prop.id);
                                    setConfirmDeleteId(null);
                                    showToast(`Deleted listing ${prop.title}`);
                                  }}
                                  className="px-2.5 py-1 bg-red-600 text-white text-[11px] rounded-full cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1 bg-[#302f2f] text-white text-[11px] rounded-full cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditProperty(prop)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#302f2f] hover:bg-white hover:text-black border border-[#c6c6c6]/40 text-white rounded-full transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(prop.id)}
                                  aria-label={`Delete ${prop.title}`}
                                  className="p-1 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 2: ADD / EDIT PROPERTY FORM */}
          {activeSection === 'editor' && (
            <div className="max-w-4xl mx-auto bg-white text-black border border-[#c6c6c6] p-6 sm:p-8">
              <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
                <div>
                  <h3 className="font-roboto text-2xl font-medium text-black">
                    {editingId
                      ? `Edit Listing — ${formState.title}`
                      : 'Add New Property Listing'}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    Updates appear immediately in the Current Listings carousel and Properties directory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('inventory')}
                  className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveProperty} className="mt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Street Address Heading *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.title}
                      onChange={(e) =>
                        setFormState({ ...formState, title: e.target.value })
                      }
                      placeholder="e.g. 14A Sill Street"
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Suburb *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.suburb}
                      onChange={(e) =>
                        setFormState({ ...formState, suburb: e.target.value })
                      }
                      placeholder="e.g. Bentley"
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Full Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.address}
                      onChange={(e) =>
                        setFormState({ ...formState, address: e.target.value })
                      }
                      placeholder="14A Sill Street, Bentley WA 6102"
                      className="zenu-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-black mb-1">
                      Price Display (Shown on Card Overlay) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formState.priceDisplay}
                      onChange={(e) =>
                        setFormState({ ...formState, priceDisplay: e.target.value })
                      }
                      placeholder="e.g. Expression of Interest or $750,000"
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Top-Left Badge
                    </label>
                    <input
                      type="text"
                      value={formState.badgeText || ''}
                      onChange={(e) =>
                        setFormState({ ...formState, badgeText: e.target.value })
                      }
                      placeholder="e.g. Just Listed"
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Category
                    </label>
                    <select
                      value={formState.category}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          category: e.target.value as ListingCategory,
                        })
                      }
                      className="zenu-input w-full"
                    >
                      <option value="Residential Sale">Residential Sale</option>
                      <option value="Residential Lease">Residential Lease</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Sold">Sold</option>
                      <option value="Leased">Leased</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-neutral-200">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.bedrooms}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          bedrooms: Number(e.target.value) || 0,
                        })
                      }
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.bathrooms}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          bathrooms: Number(e.target.value) || 0,
                        })
                      }
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Car Spaces
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.carSpaces}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          carSpaces: Number(e.target.value) || 0,
                        })
                      }
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Land (sqm)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formState.landSizeSqm}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          landSizeSqm: Number(e.target.value) || 0,
                        })
                      }
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Lead Agent
                    </label>
                    <select
                      value={formState.agentId}
                      onChange={(e) =>
                        setFormState({ ...formState, agentId: e.target.value })
                      }
                      className="zenu-input w-full"
                    >
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Image Picker */}
                <div className="pt-4 border-t border-neutral-200 space-y-3">
                  <label className="block text-xs font-medium text-black">
                    Property Photography (Select Original Zenu Image or Paste Custom URL)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() =>
                          setFormState({ ...formState, imageUrl: img.url })
                        }
                        className={`text-left border p-1.5 transition-all cursor-pointer ${
                          formState.imageUrl === img.url
                            ? 'border-black bg-neutral-100 ring-1 ring-black'
                            : 'border-neutral-300 hover:border-black'
                        }`}
                      >
                        <div className="aspect-4/3 w-full overflow-hidden bg-black mb-1">
                          <PropertyImage
                            src={img.url}
                            alt={img.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-[11px] font-medium text-black truncate">
                          {img.label}
                        </p>
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formState.imageUrl}
                    onChange={(e) =>
                      setFormState({ ...formState, imageUrl: e.target.value })
                    }
                    placeholder="https://images.zenu.com.au/..."
                    className="zenu-input w-full"
                  />
                </div>

                {/* Description */}
                <div className="space-y-4 pt-4 border-t border-neutral-200">
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Property Headline
                    </label>
                    <input
                      type="text"
                      value={formState.headline}
                      onChange={(e) =>
                        setFormState({ ...formState, headline: e.target.value })
                      }
                      placeholder="Short summary headline..."
                      className="zenu-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Full Description
                    </label>
                    <textarea
                      rows={4}
                      value={formState.description}
                      onChange={(e) =>
                        setFormState({ ...formState, description: e.target.value })
                      }
                      className="w-full p-3 font-poppins text-sm text-[#363636] bg-[#ededed] border border-[#f7f9fa]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black mb-1">
                      Key Features (One per line)
                    </label>
                    <textarea
                      rows={3}
                      value={featuresText}
                      onChange={(e) => setFeaturesText(e.target.value)}
                      className="w-full p-3 font-poppins text-sm text-[#363636] bg-[#ededed] border border-[#f7f9fa]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setActiveSection('inventory')}
                    className="px-5 py-2 text-xs font-inter text-black border border-black rounded-full cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="zenu-button">
                    {editingId ? 'Save Changes' : 'Publish Listing'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 3: ENQUIRIES */}
          {activeSection === 'enquiries' && (
            <div className="max-w-[1200px] mx-auto bg-[#000000] border border-[#c6c6c6]/30 p-6 sm:p-8">
              <h3 className="font-cormorant text-3xl font-light text-white">
                Submitted Enquiries & Appraisal Requests
              </h3>
              <div className="mt-6 divide-y divide-[#302f2f]">
                {enquiries.map((enq) => (
                  <div
                    key={enq.id}
                    className="py-5 flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <span className="text-white font-medium">{enq.type}</span>
                        <span>·</span>
                        <span className="tabular-nums">{enq.createdAt}</span>
                        <span>·</span>
                        <span>Status: {enq.status}</span>
                      </div>
                      <p className="text-sm font-medium text-white">
                        {enq.clientName} ({enq.email} · {enq.phone})
                      </p>
                      {(enq.propertyTitle || enq.suburbOrAddress) && (
                        <p className="text-xs text-white/80">
                          Property: {enq.propertyTitle || enq.suburbOrAddress}
                        </p>
                      )}
                      <p className="text-xs text-white/70 leading-relaxed pt-1">
                        “{enq.message}”
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={enq.status}
                        onChange={(e) => {
                          onUpdateEnquiryStatus(
                            enq.id,
                            e.target.value as ClientEnquiry['status']
                          );
                          showToast(`Updated status for ${enq.clientName}`);
                        }}
                        className="text-xs bg-[#302f2f] border border-[#c6c6c6]/40 px-3 py-1.5 text-white"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: TEAM */}
          {activeSection === 'agents' && (
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-[#000000] border border-[#c6c6c6] overflow-hidden flex flex-col"
                >
                  <div className="h-64 w-full bg-[#302f2f] overflow-hidden">
                    <PropertyImage
                      src={member.photoUrl}
                      alt={member.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-cormorant text-2xl text-white">
                        {member.name}
                      </h4>
                      <p className="text-xs text-white/70 mt-1">{member.role}</p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-[#302f2f] flex items-center justify-between text-xs text-white/80">
                      <span>{member.email}</span>
                      <span className="tabular-nums">{member.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
