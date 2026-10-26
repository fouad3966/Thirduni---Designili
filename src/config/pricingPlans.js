// Official exchange rate from Designili Financial Plan (October 2026): 1 USD = 134 DA
export const USD_TO_DA = 134;

export const formatCurrency = (amountDA, currency = 'DA') => {
  if (currency === 'USD') {
    const usd = (amountDA / USD_TO_DA).toFixed(2);
    return `$${usd}`;
  }
  if (currency === 'BOTH') {
    const usd = (amountDA / USD_TO_DA).toFixed(2);
    return `${amountDA.toLocaleString()} DA ($${usd})`;
  }
  return `${amountDA.toLocaleString()} DA`;
};

export const MANDATORY_PAYMENT_NOTICE =
  'Your plan covers the design tools. The garment and printing are paid separately to the print shop you choose.';

export function getPlanQuota(planId, billingCycle = 'monthly') {
  if (planId === 'free') return 3;
  if (planId === 'pro') return billingCycle === 'annual' ? 100 : 60;
  if (planId === 'studio') return 150;
  if (planId === 'business') return 300;
  if (planId === 'business_plus') return 600;
  return 3;
}

export const INDIVIDUAL_PLANS = {
  free: {
    id: 'free',
    name: 'Free Trial',
    badge: 'Starter',
    audience: 'individuals',
    price: {
      monthly: { usd: 0, da: 0 },
      annual: { usd: 0, da: 0 },
    },
    generations: {
      monthly: 3,
      annual: 3,
      isTotal: true,
      label: '3 AI generations total',
    },
    features: [
      { text: '3 AI generations total', included: true },
      { text: 'Browse community stores & 3D designs', included: true },
      { text: 'Unlimited 3D rotation & color styling', included: true },
      { text: 'Live AR "Wear It" Camera try-on', included: false, lockedNotice: 'Unlocked on Pro ($9 / 1,200 DA)' },
      { text: 'Order physical garment from Partner Print Shops', included: false, lockedNotice: 'Unlocked on Pro ($9 / 1,200 DA)' },
      { text: 'High-res exports (PNG, SVG, PDF) for outside printers', included: false, lockedNotice: 'Unlocked on Studio ($19 / 2,550 DA)' },
      { text: 'Print with any outside print shop', included: false },
    ],
    ctaText: 'Current Plan',
    isCurrent: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro Designer',
    badge: 'Most Popular',
    audience: 'individuals',
    isPopular: true,
    price: {
      monthly: { usd: 9, da: 1200 },
      annual: { usd: 79, da: 10600, monthlyEquivalent: { usd: 6.58, da: 880 } },
    },
    generations: {
      monthly: 60,
      annual: 100, // Annual bonus: 100 gens/month
      isTotal: false,
      label: '60/month (100/mo on Annual)',
    },
    features: [
      { text: '60 AI generations/month (100/mo on Annual)', included: true },
      { text: 'Browse community stores & 3D designs', included: true },
      { text: 'Unlimited 3D rotation & color styling', included: true },
      { text: 'Live AR "Wear It" Camera try-on (MediaPipe)', included: true },
      { text: 'Order physical garment from Partner Print Shops', included: true },
      { text: 'Automatic 3D techpack dispatched to shop', included: true },
      { text: 'High-res exports (PNG, SVG, PDF) for outside printers', included: false, lockedNotice: 'Unlocked on Studio ($19 / 2,550 DA)' },
    ],
    ctaText: 'Upgrade to Pro',
  },
  studio: {
    id: 'studio',
    name: 'Studio Master',
    badge: 'Full Freedom',
    audience: 'individuals',
    price: {
      monthly: { usd: 19, da: 2550 },
      annual: { usd: 169, da: 22600, monthlyEquivalent: { usd: 14.08, da: 1890 } },
    },
    generations: {
      monthly: 150,
      annual: 150,
      isTotal: false,
      label: '150 AI generations/month',
    },
    features: [
      { text: '150 AI generations/month', included: true },
      { text: 'Live AR "Wear It" Camera try-on', included: true },
      { text: 'Order from Partner Print Shops', included: true },
      { text: 'Export high-res PNG, SVG & vector PDF', included: true, highlight: true },
      { text: 'Print with ANY outside shop (0% platform commission)', included: true, highlight: true },
      { text: 'Commercial resale design license', included: true },
      { text: 'Priority rendering queue', included: true },
    ],
    ctaText: 'Upgrade to Studio',
  },
};

export const COMPANY_PLANS = {
  business: {
    id: 'business',
    name: 'Business',
    badge: 'Recommended for Teams',
    audience: 'companies',
    isPopular: true,
    price: {
      monthly: { usd: 39, da: 5200 },
      annual: { usd: 349, da: 46800, monthlyEquivalent: { usd: 29.08, da: 3900 } },
    },
    generations: {
      monthly: 300,
      annual: 300,
      isTotal: false,
      label: '300 shared AI generations/month',
    },
    features: [
      { text: '300 shared AI generations/month', included: true },
      { text: 'Live AR "Wear It" Camera try-on', included: true },
      { text: 'Company Brand Kit (Saved logos, Pantone swatches)', included: true, highlight: true },
      { text: 'Bulk Orders (Multi-size matrix, 20–500+ pcs)', included: true, highlight: true },
      { text: 'Dispatched to verified industrial textile shops', included: true },
      { text: 'Centralized team billing & invoices in DA', included: true },
      { text: 'Outside printer exports (PDF/SVG)', included: false, lockedNotice: 'Unlocked on Business Plus' },
    ],
    ctaText: 'Upgrade to Business',
  },
  business_plus: {
    id: 'business_plus',
    name: 'Business Plus',
    badge: 'Enterprise Tier',
    audience: 'companies',
    price: {
      monthly: { usd: 79, da: 10600 },
      annual: { usd: 699, da: 93700, monthlyEquivalent: { usd: 58.25, da: 7810 } },
    },
    generations: {
      monthly: 600,
      annual: 600,
      isTotal: false,
      label: '600 shared AI generations/month',
    },
    features: [
      { text: '600 shared AI generations/month', included: true },
      { text: 'Company Brand Kit & multi-brand management', included: true },
      { text: 'Bulk Orders with factory volume discounts', included: true },
      { text: 'Full vector exports (PDF, SVG, 300 DPI PNG)', included: true, highlight: true },
      { text: 'Freedom to print with outside factories', included: true, highlight: true },
      { text: 'Dedicated account manager & SLA support', included: true },
      { text: 'Custom 3D garment model onboarding', included: true },
    ],
    ctaText: 'Upgrade to Business Plus',
  },
};

export const ALL_PLANS = {
  ...INDIVIDUAL_PLANS,
  ...COMPANY_PLANS,
};

// Unit Economics data from Sections 4, 5 & 6 of Financial Plan (October 2026)
export const UNIT_ECONOMICS = {
  free: {
    title: 'Free Trial (Sign-up CAC)',
    monthlyRev: '$0.00 (0 DA)',
    aiCost: '$0.09 (12 DA)', // 3 gens * $0.03
    paymentFee: '$0.00',
    netMargin: '-$0.09 (-12 DA)',
    marginPercent: '0%',
    note: 'Funded by platform customer acquisition budget (3 gens max)',
  },
  pro: {
    title: 'Pro Plan',
    monthly: {
      rev: '$9.00 (1,200 DA)',
      maxAiCost: '$1.80 (240 DA)', // 60 gens * $0.03
      paymentFee: '$0.27 (36 DA)', // 3% payment gateway
      netMargin: '$6.93 (930 DA)',
      marginPercent: '77%',
    },
    annual: {
      revMo: '$6.58 (880 DA)/mo',
      totalAnnual: '$79.00 (10,600 DA)',
      maxAiCost: '$3.00 (400 DA)', // 100 gens * $0.03
      paymentFee: '$0.20 (27 DA)',
      netMargin: '$3.38 (450 DA)',
      marginPercent: '51%',
    },
  },
  studio: {
    title: 'Studio Plan',
    monthly: {
      rev: '$19.00 (2,550 DA)',
      maxAiCost: '$4.50 (600 DA)', // 150 gens * $0.03
      paymentFee: '$0.57 (76 DA)',
      netMargin: '$13.93 (1,870 DA)',
      marginPercent: '73%',
    },
    annual: {
      revMo: '$14.08 (1,890 DA)/mo',
      totalAnnual: '$169.00 (22,600 DA)',
      maxAiCost: '$4.50 (600 DA)',
      paymentFee: '$0.42 (56 DA)',
      netMargin: '$9.16 (1,230 DA)',
      marginPercent: '65%',
    },
  },
  business: {
    title: 'Business Plan',
    monthly: {
      rev: '$39.00 (5,200 DA)',
      maxAiCost: '$9.00 (1,200 DA)', // 300 gens * $0.03
      paymentFee: '$1.17 (157 DA)',
      netMargin: '$28.83 (3,860 DA)',
      marginPercent: '74%',
    },
    annual: {
      revMo: '$29.08 (3,900 DA)/mo',
      totalAnnual: '$349.00 (46,800 DA)',
      maxAiCost: '$9.00 (1,200 DA)',
      paymentFee: '$0.87 (117 DA)',
      netMargin: '$19.21 (2,570 DA)',
      marginPercent: '66%',
    },
  },
  business_plus: {
    title: 'Business Plus',
    monthly: {
      rev: '$79.00 (10,600 DA)',
      maxAiCost: '$18.00 (2,400 DA)', // 600 gens * $0.03
      paymentFee: '$2.37 (318 DA)',
      netMargin: '$58.63 (7,860 DA)',
      marginPercent: '74%',
    },
    annual: {
      revMo: '$58.25 (7,810 DA)/mo',
      totalAnnual: '$699.00 (93,700 DA)',
      maxAiCost: '$18.00 (2,400 DA)',
      paymentFee: '$1.75 (234 DA)',
      netMargin: '$38.50 (5,160 DA)',
      marginPercent: '66%',
    },
  },
};

export const YEAR_1_MILESTONES = {
  breakevenMonth: 'Month 3',
  breakevenNet: '$134 (18,000 DA) net profit',
  cumulativeBreakevenMonth: 'Month 4',
  year1TotalRevenue: '$19,241 (2,578,300 DA)',
  year1NetProfit: '$13,699 (1,835,700 DA)',
  year1NetMargin: '71.2%',
  revenueStreams: [
    { label: 'Individual Subscriptions (Pro & Studio)', percentage: 73, amountDA: '1,882,000 DA' },
    { label: 'Company Subscriptions (Business)', percentage: 11, amountDA: '283,600 DA' },
    { label: 'Print Shop Commissions (15% COD)', percentage: 16, amountDA: '412,700 DA' },
  ],
};

// Algerian Wilayas with major coverage
export const ALGERIAN_WILAYAS = [
  { code: '16', name: 'Alger', hub: 'central' },
  { code: '31', name: 'Oran', hub: 'west' },
  { code: '25', name: 'Constantine', hub: 'east' },
  { code: '09', name: 'Blida', hub: 'central' },
  { code: '19', name: 'Sétif', hub: 'east' },
  { code: '13', name: 'Tlemcen', hub: 'west' },
  { code: '06', name: 'Béjaïa', hub: 'east' },
  { code: '23', name: 'Annaba', hub: 'east' },
  { code: '35', name: 'Boumerdès', hub: 'central' },
  { code: '15', name: 'Tizi Ouzou', hub: 'central' },
  { code: '22', name: 'Sidi Bel Abbès', hub: 'west' },
  { code: '27', name: 'Mostaganem', hub: 'west' },
  { code: '05', name: 'Batna', hub: 'east' },
  { code: '30', name: 'Ouargla', hub: 'south' },
  { code: '47', name: 'Ghardaïa', hub: 'south' },
];

// Verified Partner Print Shops from Section 3
export const PARTNER_PRINT_SHOPS = [
  {
    id: 'oran-print-hub',
    name: 'Oran Atelier Print Hub',
    city: 'Oran (El Bahia)',
    wilayasCovered: ['31', '22', '13', '27', '29', '46'],
    rating: 4.9,
    reviewsCount: 142,
    verified: true,
    basePriceDA: 2900,
    basePriceUSD: 21.64,
    deliveryFeeDA: 400,
    deliveryTimeLocal: '1–2 business days',
    deliveryTimeNational: '3–4 business days',
    specialties: ['Direct-to-Garment (DTG)', 'Embroidery (Broderie)', 'Organic Cotton'],
    bulkDiscountPercent: 20,
    minBulkQty: 10,
    description: 'Specialists in 3D sublimation, premium DTG printing, and traditional Algerian embroidery on modern cuts.',
  },
  {
    id: 'casbah-textile-alger',
    name: 'Casbah Textile Studio Alger',
    city: 'Alger (Kouba / Didouche)',
    wilayasCovered: ['16', '09', '35', '15', '42'],
    rating: 4.95,
    reviewsCount: 318,
    verified: true,
    basePriceDA: 3100,
    basePriceUSD: 23.13,
    deliveryFeeDA: 350,
    deliveryTimeLocal: 'Same day / 24h Express',
    deliveryTimeNational: '2–3 business days',
    specialties: ['High-Density Screen Print', 'Luxury Caftan Stamping', 'Express Delivery'],
    bulkDiscountPercent: 25,
    minBulkQty: 15,
    description: 'Flagship studio in Algiers. Fast express courier across Greater Algiers, Blida, and Boumerdes with color-matched textile ink.',
  },
  {
    id: 'cirta-custom-press',
    name: 'Cirta Custom Press Constantine',
    city: 'Constantine',
    wilayasCovered: ['25', '19', '23', '05', '21', '04'],
    rating: 4.85,
    reviewsCount: 97,
    verified: true,
    basePriceDA: 2800,
    basePriceUSD: 20.9,
    deliveryFeeDA: 450,
    deliveryTimeLocal: '2 business days',
    deliveryTimeNational: '3–5 business days',
    specialties: ['Direct-to-Film (DTF)', 'Screen Print', 'Technical Garment Assembly'],
    bulkDiscountPercent: 18,
    minBulkQty: 10,
    description: 'Eastern hub leader for DTF transfers, hoodie fleece printing, and university batch orders.',
  },
  {
    id: 'atlas-pro-merch',
    name: 'Atlas Pro Merchandise DZ',
    city: 'National Distribution (Blida)',
    wilayasCovered: ['ALL', '16', '31', '25', '09', '19', '13', '06', '23', '35', '15', '22', '27', '05', '30', '47'],
    rating: 4.8,
    reviewsCount: 205,
    verified: true,
    basePriceDA: 3000,
    basePriceUSD: 22.4,
    deliveryFeeDA: 500,
    deliveryTimeLocal: '2–3 business days',
    deliveryTimeNational: '3–5 business days',
    specialties: ['Industrial Bulk Production', 'Corporate Uniforms', 'Full Sublimation'],
    bulkDiscountPercent: 30,
    minBulkQty: 20,
    description: 'High-volume production partner ideal for company orders of 50 to 1,000+ pieces with custom tag labels.',
  },
];
