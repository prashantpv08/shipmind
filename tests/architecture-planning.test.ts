import { describe, expect, it } from 'vitest';
import { compileArchitecturePackages, defaultArchitecturePlanningInput } from '../src/projects/architecture-planning';
import { architectureBudgetMinimums, architectureHostingBudgetGuidance } from '../src/projects/architecture-budget';
import { ArchitecturePlanningInput } from '../src/projects/schemas';

const entity = { id: 'REQ-1', category: 'REQUIREMENT', text: 'Operators manage customer records.', truthStatus: 'SOURCE_GROUNDED' };

describe('architecture and hosting planning', () => {
  it('offers a genuinely lean PHP, HTML, and SQLite package when those constraints fit', () => {
    const brief = ArchitecturePlanningInput.parse({
      ...defaultArchitecturePlanningInput(),
      deliveryPriority: 'LOWEST_COST',
      teamSkills: ['HTML_CSS_JS', 'PHP_LARAVEL'],
      hostingPreference: 'SELF_HOSTED',
      selectedPackageId: 'LEAN',
    });
    const packages = compileArchitecturePackages({ projectName: 'Case Portal', entities: [entity], brief, confirmed: true });
    const lean = packages.find((item) => item.id === 'LEAN');

    expect(packages).toHaveLength(3);
    expect(lean?.frontend).toContain('HTML5');
    expect(lean?.backend).toContain('Laravel');
    expect(lean?.database).toContain('SQLite');
    expect(lean?.hosting).toContain('VPS');
    expect(lean?.validation.find((item) => item.label === 'Runtime proof')?.status).toBe('NEEDS_EVIDENCE');
  });

  it('selects a mobile stack from confirmed team skills without pretending runtime proof', () => {
    const brief = ArchitecturePlanningInput.parse({
      ...defaultArchitecturePlanningInput(),
      productSurface: 'WEB_AND_MOBILE',
      teamSkills: ['REACT_TYPESCRIPT'],
      expectedScale: 'GROWING',
      mobileCapabilities: ['PUSH_NOTIFICATIONS', 'OFFLINE'],
      selectedPackageId: 'BALANCED',
    });
    const packages = compileArchitecturePackages({ projectName: 'Field Service', entities: [entity], brief, confirmed: true });
    const balanced = packages.find((item) => item.id === 'BALANCED');

    expect(balanced?.frontend).toBe('React with TypeScript');
    expect(balanced?.mobile).toContain('React Native');
    expect(balanced?.database).toBe('Managed PostgreSQL');
    expect(balanced?.validation.every((item) => item.status !== 'NEEDS_EVIDENCE' || item.label === 'Runtime proof')).toBe(true);
  });

  it('requires a provider name when the user chooses an existing hosting account', () => {
    const result = ArchitecturePlanningInput.safeParse({
      ...defaultArchitecturePlanningInput(),
      hostingPreference: 'CONNECT_EXISTING',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['preferredProvider']);
  });

  it('treats AI implementation as an operating assumption rather than team-skill proof', () => {
    const brief = ArchitecturePlanningInput.parse({
      ...defaultArchitecturePlanningInput(),
      teamSkills: ['AI_ASSISTED'],
    });
    const packages = compileArchitecturePackages({ projectName: 'AI-built Portal', entities: [entity], brief, confirmed: true });
    const selected = packages.find((item) => item.id === brief.selectedPackageId);

    expect(selected?.why[0]).toContain('No implementation-language preference');
    expect(selected?.validation.find((item) => item.label === 'Team fit')).toMatchObject({ status: 'ASSUMPTION' });
    expect(selected?.validation.find((item) => item.label === 'Team fit')?.detail).toContain('production ownership');
  });

  it('rejects unrealistic budgets using workload and currency-specific minimums', () => {
    const tooLow = ArchitecturePlanningInput.safeParse({
      ...defaultArchitecturePlanningInput(),
      developmentBudget: { currency: 'INR', maximum: 100 },
      monthlyHostingBudget: { currency: 'INR', maximum: 100 },
    });
    const minimumAccepted = ArchitecturePlanningInput.safeParse({
      ...defaultArchitecturePlanningInput(),
      developmentBudget: { currency: 'INR', maximum: 10_000 },
      monthlyHostingBudget: { currency: 'INR', maximum: 1_500 },
    });

    expect(tooLow.success).toBe(false);
    if (!tooLow.success) {
      expect(tooLow.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['developmentBudget', 'maximum'], message: expect.stringContaining('₹10,000') }),
        expect.objectContaining({ path: ['monthlyHostingBudget', 'maximum'], message: expect.stringContaining('₹1,500') }),
      ]));
    }
    expect(minimumAccepted.success).toBe(true);
  });

  it('allows a zero-cost static-site tier without applying it to a dynamic app', () => {
    const staticInput = {
      ...defaultArchitecturePlanningInput(),
      productSurface: 'STATIC_SITE' as const,
      expectedScale: 'PROTOTYPE' as const,
      selectedPackageId: 'LEAN' as const,
      monthlyHostingBudget: { currency: 'INR' as const, maximum: 0 },
    };
    const dynamicInput = {
      ...staticInput,
      productSurface: 'WEB_APP' as const,
    };

    expect(ArchitecturePlanningInput.safeParse(staticInput).success).toBe(true);
    expect(ArchitecturePlanningInput.safeParse(dynamicInput).success).toBe(false);
    expect(architectureBudgetMinimums(dynamicInput).monthlyHosting).toBe(500);
  });

  it('raises the hosting floor for managed, mobile, and growing workloads', () => {
    const managedWeb = ArchitecturePlanningInput.safeParse({
      ...defaultArchitecturePlanningInput(),
      developmentBudget: { currency: 'GBP', maximum: 10_000 },
      monthlyHostingBudget: { currency: 'GBP', maximum: 3 },
    });
    const growingApi = {
      ...defaultArchitecturePlanningInput(),
      productSurface: 'API_SERVICE' as const,
      expectedScale: 'GROWING' as const,
      selectedPackageId: 'LEAN' as const,
      monthlyHostingBudget: { currency: 'USD' as const, maximum: 36 },
    };
    const mobile = {
      ...defaultArchitecturePlanningInput(),
      productSurface: 'WEB_AND_MOBILE' as const,
      selectedPackageId: 'BALANCED' as const,
      monthlyHostingBudget: { currency: 'INR' as const, maximum: 3_000 },
    };

    expect(managedWeb.success).toBe(false);
    if (!managedWeb.success) expect(managedWeb.error.issues[0]?.message).toContain('£15');
    expect(ArchitecturePlanningInput.safeParse(growingApi).success).toBe(true);
    expect(architectureBudgetMinimums(growingApi).monthlyHosting).toBe(36);
    expect(architectureBudgetMinimums(mobile).monthlyHosting).toBe(3_000);
    expect(architectureHostingBudgetGuidance(mobile)).toContain('Excludes introductory discounts, taxes, domains, email, and app-store fees.');
  });
});
