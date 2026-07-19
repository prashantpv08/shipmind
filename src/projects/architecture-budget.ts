export const ARCHITECTURE_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'] as const;
export type ArchitectureCurrency = typeof ARCHITECTURE_CURRENCIES[number];

type ProductSurface = 'STATIC_SITE' | 'WEB_APP' | 'MOBILE_APP' | 'WEB_AND_MOBILE' | 'API_SERVICE';
type PackageId = 'LEAN' | 'BALANCED' | 'SCALE_READY';
type ExpectedScale = 'PROTOTYPE' | 'SMALL' | 'GROWING' | 'HIGH_SCALE';
type CurrencyMinimums = Record<ArchitectureCurrency, number>;

export const CURRENCY_BUDGET_MINIMUMS: Record<ArchitectureCurrency, { development: number }> = {
  USD: { development: 100 },
  INR: { development: 10_000 },
  EUR: { development: 100 },
  GBP: { development: 85 },
};

const HOSTING_MINIMUMS: Record<ProductSurface, Record<PackageId, CurrencyMinimums>> = {
  STATIC_SITE: {
    LEAN: { USD: 0, INR: 0, EUR: 0, GBP: 0 },
    BALANCED: { USD: 4, INR: 300, EUR: 4, GBP: 3 },
    SCALE_READY: { USD: 12, INR: 1_000, EUR: 11, GBP: 9 },
  },
  WEB_APP: {
    LEAN: { USD: 6, INR: 500, EUR: 6, GBP: 5 },
    BALANCED: { USD: 18, INR: 1_500, EUR: 17, GBP: 15 },
    SCALE_READY: { USD: 60, INR: 5_000, EUR: 55, GBP: 45 },
  },
  API_SERVICE: {
    LEAN: { USD: 6, INR: 500, EUR: 6, GBP: 5 },
    BALANCED: { USD: 18, INR: 1_500, EUR: 17, GBP: 15 },
    SCALE_READY: { USD: 60, INR: 5_000, EUR: 55, GBP: 45 },
  },
  MOBILE_APP: {
    LEAN: { USD: 12, INR: 1_000, EUR: 11, GBP: 9 },
    BALANCED: { USD: 24, INR: 2_000, EUR: 22, GBP: 18 },
    SCALE_READY: { USD: 60, INR: 5_000, EUR: 55, GBP: 45 },
  },
  WEB_AND_MOBILE: {
    LEAN: { USD: 18, INR: 1_500, EUR: 17, GBP: 15 },
    BALANCED: { USD: 36, INR: 3_000, EUR: 33, GBP: 28 },
    SCALE_READY: { USD: 72, INR: 6_000, EUR: 66, GBP: 55 },
  },
};

const DYNAMIC_SCALE_MINIMUMS: Record<ExpectedScale, CurrencyMinimums> = {
  PROTOTYPE: { USD: 0, INR: 0, EUR: 0, GBP: 0 },
  SMALL: { USD: 0, INR: 0, EUR: 0, GBP: 0 },
  GROWING: { USD: 36, INR: 3_000, EUR: 33, GBP: 28 },
  HIGH_SCALE: { USD: 60, INR: 5_000, EUR: 55, GBP: 45 },
};

const SURFACE_LABELS: Record<ProductSurface, string> = {
  STATIC_SITE: 'static website',
  WEB_APP: 'web app',
  MOBILE_APP: 'mobile app',
  WEB_AND_MOBILE: 'web and mobile product',
  API_SERVICE: 'API or service',
};

const PACKAGE_LABELS: Record<PackageId, string> = {
  LEAN: 'lean package',
  BALANCED: 'managed package',
  SCALE_READY: 'scale-ready package',
};

export type ArchitectureBudgetInput = {
  productSurface: ProductSurface;
  selectedPackageId: PackageId;
  expectedScale: ExpectedScale;
  developmentBudget: { currency: ArchitectureCurrency; maximum: number };
  monthlyHostingBudget: { currency: ArchitectureCurrency; maximum: number };
};

export function formatArchitectureMoney(currency: ArchitectureCurrency, amount: number) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function architectureBudgetMinimums(input: ArchitectureBudgetInput) {
  const currency = input.monthlyHostingBudget.currency;
  const packageMinimum = HOSTING_MINIMUMS[input.productSurface][input.selectedPackageId][currency];
  const scaleMinimum = input.productSurface === 'STATIC_SITE' ? 0 : DYNAMIC_SCALE_MINIMUMS[input.expectedScale][currency];
  const monthlyHosting = Math.max(packageMinimum, scaleMinimum);
  const scaleBasis = scaleMinimum > packageMinimum
    ? `${input.expectedScale.toLowerCase().replace('_', ' ')} scale`
    : PACKAGE_LABELS[input.selectedPackageId];

  return {
    development: CURRENCY_BUDGET_MINIMUMS[input.developmentBudget.currency].development,
    monthlyHosting,
    hostingBasis: `${SURFACE_LABELS[input.productSurface]} with the ${scaleBasis}`,
  };
}

export function architectureHostingBudgetGuidance(input: ArchitectureBudgetInput) {
  const minimums = architectureBudgetMinimums(input);
  const amount = formatArchitectureMoney(input.monthlyHostingBudget.currency, minimums.monthlyHosting);
  const freeTier = minimums.monthlyHosting === 0 ? 'A free-tier baseline is possible' : `Planning baseline ${amount}/month`;
  return `${freeTier} for a ${minimums.hostingBasis}. Excludes introductory discounts, taxes, domains, email, and app-store fees.`;
}

export function architectureBudgetErrors(input: ArchitectureBudgetInput) {
  const minimums = architectureBudgetMinimums(input);
  return {
    development: input.developmentBudget.maximum < minimums.development
      ? `Minimum planning budget is ${formatArchitectureMoney(input.developmentBudget.currency, minimums.development)}.`
      : '',
    monthlyHosting: input.monthlyHostingBudget.maximum < minimums.monthlyHosting
      ? `Minimum planning ceiling for a ${minimums.hostingBasis} is ${formatArchitectureMoney(input.monthlyHostingBudget.currency, minimums.monthlyHosting)}/month. Promotional prices and taxes are not included.`
      : '',
  };
}
