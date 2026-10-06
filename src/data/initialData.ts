export type ListingCategory = 'Residential Sale' | 'Residential Lease' | 'Commercial' | 'Sold' | 'Leased';

export type ListingStatus = 'Available' | 'Under Offer' | 'Sold' | 'Leased' | 'Off-Market';

export interface PropertyListing {
  id: string;
  title: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  priceDisplay: string;
  numericPrice: number;
  category: ListingCategory;
  status: ListingStatus;
  badgeText?: string;
  propertyType: 'House' | 'Apartment / Penthouse' | 'Townhouse' | 'Commercial Suite' | 'Development Land';
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
  landSizeSqm: number;
  buildingAreaSqm: number;
  imageUrl: string;
  galleryUrls?: string[];
  agentId: string;
  coAgentId?: string;
  featured: boolean;
  inspectionTime: string;
  headline: string;
  description: string;
  features: string[];
  listedDate: string;
  soldDate?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  qualification: string;
  phone: string;
  email: string;
  photoUrl: string;
  languages: string[];
  specialties: string[];
  bio: string;
  activeListingsCount: number;
  soldCount12Months: number;
  initials: string;
}

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  category: string;
  author: string;
  imageUrl: string;
  excerpt: string;
  content: string[];
  featured?: boolean;
}

export interface ClientEnquiry {
  id: string;
  type: 'Property Enquiry' | 'Free Appraisal' | 'General Contact' | 'Inspection Registration';
  clientName: string;
  email: string;
  phone: string;
  propertyTitle?: string;
  propertyId?: string;
  suburbOrAddress?: string;
  message: string;
  createdAt: string;
  status: 'New' | 'Contacted' | 'Scheduled' | 'Archived';
}

export const BRAND_ASSETS = {
  logoLightOnDark: 'https://images.zenu.com.au/6s1jma11lzt6uqwrysrab8dimoqchdzo.png',
  logoDarkOnLight: 'https://images.zenu.com.au/m4zdoht43j7tvjvtdr9yio5wr2ywg8ut.png',
  teamBannerImage: '/assets/team-banner.jpg',
  blogMay2026Image: '/assets/blog-may-2026.jpg',
  heroVimeoEmbed: 'https://player.vimeo.com/video/1097764829?badge=0&autopause=0&player_id=0&app_id=58479&loop=1&background=1&controls=0&keyboard=0&muted=1&autoplay=1&byline=0&title=0',
};

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog-perth-may-2026',
    title: 'Perth Property Market — May 2026',
    date: 'May 2026',
    category: 'Market Update',
    author: 'Wendy Chia & Calvin Liew',
    imageUrl: '/assets/blog-may-2026.jpg',
    excerpt:
      'Perth’s property market continues to outperform the nation, with rising values, strong buyer demand, and historically low supply creating a rare opportunity for homeowners. In a market defined by speed and competition, exceptional results are increasingly achieved through considered strategy, refined presentation, and expert positioning.',
    content: [
      'Perth’s property market continues to outperform the nation, with rising values, strong buyer demand, and historically low supply creating a rare opportunity for homeowners. In a market defined by speed and competition, exceptional results are increasingly achieved through considered strategy, refined presentation, and expert positioning. Explore the key trends shaping Perth in May 2026 and what they could mean for your next move.',
      'Across Applecross, Mount Pleasant, South Perth, and inner-eastern corridors such as Bentley and Belmont, days on market remain compressed while buyer attendance at first-weekend home opens continues to surge. Well-presented family residences and lock-and-leave apartments are attracting competitive offers from both local owner-occupiers and interstate or international purchasers.',
      'Whether you are considering selling a family residence, leasing an investment property under the personal supervision of Wendy Chia (Director & Licensee, Licence No. RA84388), or exploring off-market opportunities in Applecross, our team is ready to provide tailored, transparent guidance.'
    ],
    featured: true,
  },
  {
    id: 'blog-applecross-leasing-2026',
    title: 'Maximising Rental Yield & Asset Protection in Inner-South Perth',
    date: 'April 2026',
    category: 'Property Management',
    author: 'Wendy Chia',
    imageUrl: 'https://images.zenu.com.au/s1mtf0lnpl5qwf0f4jcoe0tygnh3ismw.png',
    excerpt:
      'With vacancy rates across Applecross, Como, and South Perth remaining below 1%, strategic tenant selection and proactive maintenance oversight are essential for preserving long-term capital value.',
    content: [
      'At Exceptional Real Estate, leasing and property management sit with dedicated specialists on purpose. Overseen personally by Director & Licensee Wendy Chia (Licence No. RA84388), our management portfolio is structured around rigorous tenant vetting, comprehensive ingoing condition reports, and zero-tolerance arrears control.',
      'Executive relocations and corporate tenants continue to drive strong demand for quality residences near the Swan River foreshore and Canning Bridge transport hub. By aligning preventative maintenance with timely rent reviews, landlords can secure both reliable cash flow and sustained capital appreciation.'
    ],
    featured: false,
  },
  {
    id: 'blog-commercial-canning-hwy',
    title: 'Commercial Precinct Spotlight: Canning Highway & Applecross Village',
    date: 'March 2026',
    category: 'Commercial Insight',
    author: 'Tony Cai & Wendy Chia',
    imageUrl: 'https://images.zenu.com.au/d5b1ykdixa3hlcejc5m79vlmgwnpy4pg.png',
    excerpt:
      'Demand for boutique medical, consulting, and professional office suites along the Canning Highway corridor continues to strengthen as businesses seek high-exposure suburban headquarters.',
    content: [
      'Positioned between the Swan River and the Canning Bridge interchange, the Applecross and Mount Pleasant commercial corridor offers connectivity and amenity for professional practices, medical specialists, and boutique corporate offices.',
      'Our team advises both commercial strata owners and prospective tenants on lease structuring, outgoings transparency, and long-term development feasibility across Greater Perth.'
    ],
    featured: false,
  },
];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'agent-tony-cai',
    name: 'Tony Cai',
    role: 'Director & Partners',
    qualification: 'Building & Development Advisory Partner',
    phone: '0403 575 113',
    email: 'tony@gchwa.com.au',
    photoUrl: 'https://images.zenu.com.au/ig4j4lm3400mibg4b70n15vgvalos0x9.png',
    languages: ['English', 'Mandarin'],
    specialties: ['Development Sites', 'Construction & Feasibility', 'Project Marketing'],
    bio: 'Bringing over 15 years of leadership in the Western Australian building and development industry, Tony Cai offers strategic insight into construction feasibility, subdivision potential, and market opportunities.',
    activeListingsCount: 6,
    soldCount12Months: 14,
    initials: 'TC',
  },
  {
    id: 'agent-wendy-chia',
    name: 'Wendy Chia',
    role: 'Director & Licensee',
    qualification: 'Licensed Real Estate Agent (Licence No. RA84388)',
    phone: '0403 575 113',
    email: 'wendy@exceptionalrealestate.com.au',
    photoUrl: 'https://images.zenu.com.au/7sn4afuztobwye7hwa4d4k4xx1kvy9j4.png',
    languages: ['English', 'Mandarin', 'Cantonese', 'Hokkien'],
    specialties: ['Leasing & Property Management', 'Residential & Commercial Sales', 'Off-Market Advisory'],
    bio: 'Leasing and property management are overseen personally by Wendy Chia (Director & Licensee, Licence No. RA84388), alongside residential and commercial sales across Applecross and Greater Perth.',
    activeListingsCount: 13,
    soldCount12Months: 21,
    initials: 'WC',
  },
  {
    id: 'agent-calvin-liew',
    name: 'Calvin Liew',
    role: 'Sales & Marketing Manager',
    qualification: 'Senior Sales & Marketing Specialist',
    phone: '0426 560 488',
    email: 'calvin@exceptionalrealestate.com.au',
    photoUrl: 'https://images.zenu.com.au/c386ta2hacjnkbzleh2a5xyd9hh8fac5.png',
    languages: ['English', 'Mandarin', 'Cantonese', 'Malay'],
    specialties: ['Strategic Campaign Marketing', 'Property Videography', 'Residential Negotiation'],
    bio: 'Calvin Liew leads sales and campaign marketing at Exceptional Real Estate, combining high-impact property videography, digital positioning, and disciplined negotiation.',
    activeListingsCount: 12,
    soldCount12Months: 19,
    initials: 'CL',
  },
  {
    id: 'agent-bee-khaw',
    name: 'Bee Khaw',
    role: 'Sales Executive',
    qualification: 'Residential & Commercial Consultant',
    phone: '0402 571 863',
    email: 'bee@exceptionalrealestate.com.au',
    photoUrl: 'https://images.zenu.com.au/csrh4j6bigwl03lv3d5ztu34ofbbjw48.png',
    languages: ['English', 'Mandarin', 'Hokkien', 'Malay'],
    specialties: ['Residential Sales', 'Commercial Property', 'Client Relationship Management'],
    bio: 'Specializing in residential and commercial properties across Perth, Bee Khaw is known for her honest and transparent approach, with a strong base of repeat and referral clients.',
    activeListingsCount: 5,
    soldCount12Months: 11,
    initials: 'BK',
  },
  {
    id: 'agent-jacky-chan',
    name: 'Jacky Chan',
    role: 'Sales Associate',
    qualification: 'Sales Representative',
    phone: '0412 775 167',
    email: 'sales@exceptionalrealestate.com.au',
    photoUrl: 'https://images.zenu.com.au/t0vszffcn7n0sb2u453476ixmaplsulm.png',
    languages: ['English', 'Cantonese', 'Mandarin'],
    specialties: ['Residential Sales', 'Buyer Management', 'Home Open Coordination'],
    bio: 'Dedicated to responsive buyer service and local market insight across inner and southern Perth suburbs.',
    activeListingsCount: 4,
    soldCount12Months: 9,
    initials: 'JC',
  },
  {
    id: 'agent-bima-putra',
    name: 'Bima Putra',
    role: 'Sales Associate',
    qualification: 'Sales Representative',
    phone: '0424 429 895',
    email: 'sales@exceptionalrealestate.com.au',
    photoUrl: 'https://images.zenu.com.au/2kk84fpska6hjjgcq8pdqvs1nam9qatg.png',
    languages: ['English', 'Indonesian', 'Balinese'],
    specialties: ['Residential Sales', 'Client Care', 'Buyer Matching'],
    bio: 'Bringing a client-first approach and fluency in English, Indonesian, and Balinese to guide buyers and sellers smoothly through every transaction.',
    activeListingsCount: 4,
    soldCount12Months: 8,
    initials: 'BP',
  },
  {
    id: 'agent-jess-kaur',
    name: 'Jess Kaur',
    role: 'Sales Associate',
    qualification: 'Sales Representative',
    phone: '0435 245 227',
    email: 'sales@exceptionalrealestate.com.au',
    photoUrl: 'https://images.zenu.com.au/strvkxeeaqsolg83ppykh66en9ak3dvt.png',
    languages: ['English', 'Punjabi', 'Hindi'],
    specialties: ['Residential Sales', 'Property Presentation', 'Buyer Engagement'],
    bio: 'Focused on clear communication, warm client care, and helping homeowners present their properties for optimal market reception.',
    activeListingsCount: 3,
    soldCount12Months: 7,
    initials: 'JK',
  },
];

export const INITIAL_LISTINGS: PropertyListing[] = [
  {
    id: '3133458',
    title: '14A Sill Street',
    address: '14A Sill Street, Bentley WA 6102',
    suburb: 'Bentley',
    state: 'WA',
    postcode: '6102',
    priceDisplay: 'Expression of Interest',
    numericPrice: 890000,
    category: 'Residential Sale',
    status: 'Available',
    badgeText: 'Just Listed',
    propertyType: 'House',
    bedrooms: 4,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 412,
    buildingAreaSqm: 215,
    imageUrl: 'https://images.zenu.com.au/600-min/p1jghjdajuju3e1j0u8hps6yc56fpz9c.jpg',
    agentId: 'agent-wendy-chia',
    coAgentId: 'agent-calvin-liew',
    featured: true,
    inspectionTime: 'Saturday 11:00 AM – 11:45 AM',
    headline: 'Contemporary Family Residence Near Curtin University & Canning Precinct',
    description: 'Ideally positioned in a quiet Bentley pocket close to Curtin University, Westfield Carousel, and transport links, 14A Sill Street delivers modern open-plan living, generous bedroom proportions, and effortless indoor-outdoor entertaining.',
    features: [
      'Spacious open-plan living and dining zone with high ceilings',
      'Modern chef’s kitchen with stone benchtops and stainless steel appliances',
      'Private alfresco courtyard with low-maintenance landscaping',
      'Double lock-up garage with internal shoppers entry',
      'Minutes to Curtin University, Victoria Park dining strip, and Perth CBD'
    ],
    listedDate: '2026-10-01',
  },
  {
    id: '3133187',
    title: '15/193 Hay St',
    address: '15/193 Hay Street, East Perth WA 6004',
    suburb: 'East Perth',
    state: 'WA',
    postcode: '6004',
    priceDisplay: '$565000',
    numericPrice: 565000,
    category: 'Residential Sale',
    status: 'Available',
    badgeText: 'Just Listed',
    propertyType: 'Apartment / Penthouse',
    bedrooms: 2,
    bathrooms: 2,
    carSpaces: 1,
    landSizeSqm: 118,
    buildingAreaSqm: 96,
    imageUrl: 'https://images.zenu.com.au/600-min/x7938ynr0bbgjrmlw5sfw23e4o57us2t.jpg',
    agentId: 'agent-calvin-liew',
    coAgentId: 'agent-wendy-chia',
    featured: true,
    inspectionTime: 'Saturday 12:15 PM – 1:00 PM',
    headline: 'Sophisticated Inner-City Apartment Moments from Swan River & Claisebrook',
    description: 'Located in the vibrant heart of East Perth, this light-filled residence offers executive lock-and-leave convenience with resort-style complex amenities, generous balcony entertaining, and free CAT bus access right at the doorstep.',
    features: [
      'Two well-separated bedrooms with built-in robes and two modern bathrooms',
      'Stone kitchen with breakfast bar and quality appliances',
      'Secure undercover car bay plus lock-up storage unit',
      'Complex swimming pool, gymnasium, and residents lounge',
      'Walk to Langley Park, Elizabeth Quay, and Matagarup Bridge'
    ],
    listedDate: '2026-09-29',
  },
  {
    id: '3133186',
    title: '7 Beautiful Road',
    address: '7 Beautiful Road, Banksia Grove WA 6031',
    suburb: 'Banksia Grove',
    state: 'WA',
    postcode: '6031',
    priceDisplay: 'Expression of Interest',
    numericPrice: 720000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'House',
    bedrooms: 4,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 450,
    buildingAreaSqm: 224,
    imageUrl: 'https://images.zenu.com.au/600-min/0eytivvmsc5c9crcyadsmi4yxfx1ga2q.jpg',
    agentId: 'agent-bee-khaw',
    coAgentId: 'agent-jacky-chan',
    featured: true,
    inspectionTime: 'Sunday 11:30 AM – 12:15 PM',
    headline: 'Modern Family Entertainer Opposite Parklands',
    description: 'Designed for growing families seeking space and comfort, 7 Beautiful Road features a dedicated home theatre, expansive open-plan family living, and a covered alfresco overlooking a family-sized backyard.',
    features: [
      'Master suite with walk-in robe and private double-vanity ensuite',
      'Separate theatre / media lounge room',
      '900mm gas cooktop, walk-in pantry, and island bench',
      'Ducted reverse-cycle air-conditioning throughout'
    ],
    listedDate: '2026-09-26',
  },
  {
    id: '3128658',
    title: '26D Matheson Road',
    address: '26D Matheson Road, Applecross WA 6153',
    suburb: 'Applecross',
    state: 'WA',
    postcode: '6153',
    priceDisplay: '$1550',
    numericPrice: 1550,
    category: 'Residential Lease',
    status: 'Available',
    propertyType: 'House',
    bedrooms: 4,
    bathrooms: 3,
    carSpaces: 2,
    landSizeSqm: 510,
    buildingAreaSqm: 335,
    imageUrl: 'https://images.zenu.com.au/s1mtf0lnpl5qwf0f4jcoe0tygnh3ismw.png',
    agentId: 'agent-wendy-chia',
    featured: true,
    inspectionTime: 'By Private Appointment',
    headline: 'Prestige River-Precinct Executive Residence in Applecross',
    description: 'Positioned along prestigious Matheson Road just footsteps from the Swan River foreshore, this executive residence is available for lease, overseen personally by Director & Licensee Wendy Chia.',
    features: [
      'Prestigious Matheson Road Applecross riverfront enclave',
      'Multiple living zones across two luxurious levels',
      'Designer stone kitchen with integrated European appliances',
      'Applecross Senior High School catchment zone'
    ],
    listedDate: '2026-09-24',
  },
  {
    id: '3128124',
    title: '302/239 Great Eastern Highway',
    address: '302/239 Great Eastern Highway, Belmont WA 6104',
    suburb: 'Belmont',
    state: 'WA',
    postcode: '6104',
    priceDisplay: '$750,000',
    numericPrice: 750000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'Apartment / Penthouse',
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 164,
    buildingAreaSqm: 132,
    imageUrl: 'https://images.zenu.com.au/600-min/nzm30tby92qag580w7jcu6illwfa50km.jpg',
    agentId: 'agent-calvin-liew',
    coAgentId: 'agent-bima-putra',
    featured: true,
    inspectionTime: 'Saturday 1:30 PM – 2:15 PM',
    headline: 'Resort-Style Three-Bedroom Residence Between Airport & Perth CBD',
    description: 'Enjoy panoramic views and contemporary finishes in this spacious 3rd-floor residence offering immediate connectivity to Crown Perth, Optus Stadium, Swan River, and Perth Airport.',
    features: [
      'Expansive balcony ideal for year-round entertaining',
      'Two secure undercover car bays plus lock-up storeroom',
      'Heated pool, sauna, gymnasium, and BBQ pavilion in complex'
    ],
    listedDate: '2026-09-21',
  },
  {
    id: '3104935',
    title: '2/30 METHUEN WAY',
    address: '2/30 Methuen Way, Duncraig WA 6023',
    suburb: 'Duncraig',
    state: 'WA',
    postcode: '6023',
    priceDisplay: 'ABOVE $949,000',
    numericPrice: 949000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'Townhouse',
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 380,
    buildingAreaSqm: 210,
    imageUrl: 'https://images.zenu.com.au/600-min/gja7wj920enpv63024zx6ck9gkifoo5z.jpg',
    agentId: 'agent-wendy-chia',
    coAgentId: 'agent-jess-kaur',
    featured: true,
    inspectionTime: 'Saturday 10:30 AM – 11:15 AM',
    headline: 'Renovated Coastal-Corridor Home in Sought-After Duncraig',
    description: 'Stylishly appointed with light-filled living spaces, manicured gardens, and proximity to Hillarys Boat Harbour and Duncraig Senior High School.',
    features: [
      'Renovated kitchen and bathrooms with stone finishes',
      'Private landscaped alfresco entertaining area',
      'No strata levies, generous parking for multiple vehicles'
    ],
    listedDate: '2026-09-18',
  },
  {
    id: '3111984',
    title: '90 Red Swamp Place',
    address: '90 Red Swamp Place, York WA 6302',
    suburb: 'York',
    state: 'WA',
    postcode: '6302',
    priceDisplay: 'CONTACT AGENT FOR PRICE GUIDE',
    numericPrice: 850000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'Development Land',
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 4,
    landSizeSqm: 40468,
    buildingAreaSqm: 220,
    imageUrl: 'https://images.zenu.com.au/9xn11bepfn867nlwq0xa95s8i8en5vqd.png',
    agentId: 'agent-tony-cai',
    coAgentId: 'agent-wendy-chia',
    featured: false,
    inspectionTime: 'By Private Appointment',
    headline: 'Expansive Rural Lifestyle & Acreage Estate in Historic York',
    description: 'Rare acreage holding in the Avon Valley offering sweeping country views, tranquil privacy, and versatile lifestyle or agricultural potential.',
    features: [
      'Substantial landholding in Western Australia’s premier heritage town',
      'Scheme water, power connected, and large workshop shedding',
      'Scenic 75-minute drive from Eastern Perth suburbs'
    ],
    listedDate: '2026-09-15',
  },
  {
    id: '3104971',
    title: '298 KEYMER STREET',
    address: '298 Keymer Street, Cloverdale WA 6105',
    suburb: 'Cloverdale',
    state: 'WA',
    postcode: '6105',
    priceDisplay: 'Price on Application',
    numericPrice: 795000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'House',
    bedrooms: 4,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 545,
    buildingAreaSqm: 215,
    imageUrl: 'https://images.zenu.com.au/600-min/c6fl6b211p3w8c98wrzddgf9lvk0j1xy.jpg',
    agentId: 'agent-calvin-liew',
    coAgentId: 'agent-jacky-chan',
    featured: false,
    inspectionTime: 'Saturday 2:00 PM – 2:45 PM',
    headline: 'Prime Belmont Forum Precinct Residence with Strong Growth Fundamentals',
    description: 'Moments from Belmont Forum Shopping Centre, Reading Cinemas, and Forster Park, 298 Keymer Street represents an ideal family home or high-demand investment asset.',
    features: [
      'Generous land parcel in central Cloverdale location',
      'Spacious bedrooms, multiple living areas, and secure garaging',
      'Easy access to Leach Highway, Tonkin Highway, and Airport link'
    ],
    listedDate: '2026-09-12',
  },
  {
    id: '3091919',
    title: 'C/344 Coode Street',
    address: 'C/344 Coode Street, Dianella WA 6059',
    suburb: 'Dianella',
    state: 'WA',
    postcode: '6059',
    priceDisplay: '$1,000,000',
    numericPrice: 1000000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'Townhouse',
    bedrooms: 4,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 340,
    buildingAreaSqm: 245,
    imageUrl: 'https://images.zenu.com.au/600-min/osjwog8lnmhx1v2gmlu21ehj9tqttr2d.jpg',
    agentId: 'agent-wendy-chia',
    coAgentId: 'agent-bee-khaw',
    featured: false,
    inspectionTime: 'Sunday 1:00 PM – 1:45 PM',
    headline: 'Executive Rear Residence on Prestigious Coode Street',
    description: 'Tucked privately away on sought-after Coode Street bordering Inglewood and Bedford, this residence delivers high ceilings, quality stone joinery, and effortless city access.',
    features: [
      'Private rear position with secure gated driveway',
      'Gourmet kitchen with waterfall stone island',
      'Close to Dianella Plaza, Beaufort Street cafes, and Terry Tyzack Aquatic Centre'
    ],
    listedDate: '2026-09-10',
  },
  {
    id: '3085832',
    title: '2/1 Stockton Bend',
    address: '2/1 Stockton Bend, Cockburn Central WA 6164',
    suburb: 'Cockburn Central',
    state: 'WA',
    postcode: '6164',
    priceDisplay: 'CONTACT AGENT',
    numericPrice: 620000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'Apartment / Penthouse',
    bedrooms: 2,
    bathrooms: 2,
    carSpaces: 1,
    landSizeSqm: 112,
    buildingAreaSqm: 92,
    imageUrl: 'https://images.zenu.com.au/600-min/1v8b2pql4uxc7mfkio6xlvuepsbjcnsz.jpg',
    agentId: 'agent-bima-putra',
    coAgentId: 'agent-calvin-liew',
    featured: false,
    inspectionTime: 'Saturday 11:00 AM – 11:30 AM',
    headline: 'Walk to Cockburn Gateway Shopping City & Train Station',
    description: 'Modern lock-and-leave living in the heart of Cockburn Central’s vibrant town centre, ideal for first-home buyers, downsizers, or astute investors.',
    features: [
      'Footsteps to Cockburn Central Train Station and Cockburn ARC',
      'Light-filled open-plan living flowing onto private balcony',
      'Split-system reverse-cycle air-conditioning and secure parking'
    ],
    listedDate: '2026-09-08',
  },
  {
    id: '3081688',
    title: '6/48-50 Armstrong Road',
    address: '6/48-50 Armstrong Road, Wilson WA 6107',
    suburb: 'Wilson',
    state: 'WA',
    postcode: '6107',
    priceDisplay: 'EOI',
    numericPrice: 695000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'Townhouse',
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 265,
    buildingAreaSqm: 168,
    imageUrl: 'https://images.zenu.com.au/600-min/mdyuvg0axjhqcv5ra8a3ee6zg5dbs3yc.jpg',
    agentId: 'agent-wendy-chia',
    coAgentId: 'agent-calvin-liew',
    featured: false,
    inspectionTime: 'Saturday 12:30 PM – 1:15 PM',
    headline: 'Canning River Parkland Precinct Residence in Sought-After Wilson',
    description: 'Positioned near the Canning River Regional Park, Kent Street Weir, and Curtin University, this well-maintained residence offers tranquil living in a tightly held enclave.',
    features: [
      'Walking distance to Canning River trails and Lo Quay River Cafe',
      'Three generous bedrooms with built-in wardrobes',
      'Private paved courtyard and double carport/garage'
    ],
    listedDate: '2026-09-05',
  },
  {
    id: '3081541',
    title: '502/239 Great Eastern Highway',
    address: '502/239 Great Eastern Highway, Belmont WA 6104',
    suburb: 'Belmont',
    state: 'WA',
    postcode: '6104',
    priceDisplay: 'Contact Agent',
    numericPrice: 780000,
    category: 'Residential Sale',
    status: 'Available',
    propertyType: 'Apartment / Penthouse',
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 2,
    landSizeSqm: 168,
    buildingAreaSqm: 135,
    imageUrl: 'https://images.zenu.com.au/1fmx2aepki6q30oe51n9yagnblcgjlko.png',
    agentId: 'agent-wendy-chia',
    featured: false,
    inspectionTime: 'By Private Appointment',
    headline: 'Upper-Level Sky Apartment with Sweeping Views',
    description: 'Positioned on the 5th level, Residence 502 combines executive proportions, stone finishes, and resort-style amenities.',
    features: [
      '5th-floor elevation with panoramic district outlook',
      'Three bedrooms, two sleek bathrooms, two car bays',
      'Resort pool, gym, and residents lounge'
    ],
    listedDate: '2026-09-03',
  },
  {
    id: '2997890',
    title: '893 Canning Highway',
    address: '893 Canning Highway, Applecross WA 6153',
    suburb: 'Applecross',
    state: 'WA',
    postcode: '6153',
    priceDisplay: 'Price on Application',
    numericPrice: 1250000,
    category: 'Commercial',
    status: 'Available',
    propertyType: 'Commercial Suite',
    bedrooms: 0,
    bathrooms: 2,
    carSpaces: 4,
    landSizeSqm: 210,
    buildingAreaSqm: 158,
    imageUrl: 'https://images.zenu.com.au/d5b1ykdixa3hlcejc5m79vlmgwnpy4pg.png',
    agentId: 'agent-wendy-chia',
    coAgentId: 'agent-tony-cai',
    featured: true,
    inspectionTime: 'Weekdays by Appointment',
    headline: 'Sales and Leasing Across Perth’s Commercial Precincts — Canning Bridge Hub',
    description: 'High-exposure commercial suite positioned along Canning Highway in the Applecross / Mount Pleasant precinct. Ideal for medical consulting, professional services, or boutique corporate headquarters.',
    features: [
      'Prominent Canning Highway exposure near Canning Bridge Station',
      'Modern commercial fit-out with reception, boardroom, and executive suites',
      'Secure allocated parking bays and end-of-trip amenities'
    ],
    listedDate: '2026-08-28',
  },
];

export const INITIAL_ENQUIRIES: ClientEnquiry[] = [
  {
    id: 'enq-101',
    type: 'Property Enquiry',
    clientName: 'Marcus Vance',
    email: 'm.vance@perthcapital.com.au',
    phone: '0418 920 331',
    propertyTitle: '14A Sill Street, Bentley WA 6102',
    propertyId: '3133458',
    message: 'We would like to request the Expression of Interest price guide and contract documentation for 14A Sill Street.',
    createdAt: '2026-10-05 16:40',
    status: 'New',
  },
  {
    id: 'enq-102',
    type: 'Free Appraisal',
    clientName: 'Dr. Evelyn Tan',
    email: 'evelyn.tan@uwa.edu.au',
    phone: '0409 411 882',
    suburbOrAddress: '12 Duncraig Road, Applecross WA 6153',
    message: 'Considering selling our 4-bedroom home in Applecross. Would appreciate a confidential appraisal with Wendy Chia.',
    createdAt: '2026-10-04 11:15',
    status: 'Scheduled',
  },
  {
    id: 'enq-103',
    type: 'Inspection Registration',
    clientName: 'Hendrik Wijaya',
    email: 'hendrik.wijaya@jakarta-invest.id',
    phone: '0421 774 019',
    propertyTitle: '893 Canning Highway, Applecross WA 6153',
    propertyId: '2997890',
    message: 'Interested in inspecting the commercial suite at 893 Canning Highway this Friday morning.',
    createdAt: '2026-10-03 09:20',
    status: 'Contacted',
  },
];
