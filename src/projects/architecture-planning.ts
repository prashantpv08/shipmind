import type { ArchitectureBrief, ArchitecturePlanningInput } from './schemas';

export type ArchitecturePlanningEntity = { id: string; category: string; text: string; truthStatus: string };

export type ArchitectureStackPackage = {
  id: ArchitecturePlanningInput['selectedPackageId'];
  name: string;
  label: string;
  summary: string;
  frontend: string;
  backend: string;
  database: string;
  mobile: string;
  hosting: string;
  estimatedMonthlyCost: string;
  why: string[];
  tradeoffs: string[];
  connectionSteps: string[];
  automationPlan: string[];
  validation: Array<{ label: string; status: 'SUPPORTED' | 'ASSUMPTION' | 'NEEDS_EVIDENCE'; detail: string }>;
  truthStatus: 'AI_SUGGESTED';
};

export function defaultArchitecturePlanningInput(): ArchitecturePlanningInput {
  return {
    productSurface: 'WEB_APP',
    deliveryPriority: 'BALANCED',
    developmentBudget: { currency: 'USD', maximum: 25_000 },
    monthlyHostingBudget: { currency: 'USD', maximum: 250 },
    teamSize: 3,
    teamSkills: ['HTML_CSS_JS'],
    expectedScale: 'SMALL',
    hostingPreference: 'RECOMMEND_FOR_ME',
    mobileCapabilities: [],
    selectedPackageId: 'BALANCED',
  };
}

function hasSkill(brief: ArchitecturePlanningInput, skill: ArchitecturePlanningInput['teamSkills'][number]) {
  return brief.teamSkills.includes(skill);
}

function backendFor(brief: ArchitecturePlanningInput, packageId: ArchitectureStackPackage['id']) {
  if (packageId === 'LEAN' && hasSkill(brief, 'PHP_LARAVEL')) return 'PHP 8 + Laravel';
  if (packageId === 'LEAN' && hasSkill(brief, 'PYTHON')) return 'Python + Django';
  if (packageId === 'SCALE_READY' && hasSkill(brief, 'GO')) return 'Go modular services';
  if (packageId === 'SCALE_READY' && hasSkill(brief, 'JAVA')) return 'Java + Spring Boot';
  if (packageId === 'SCALE_READY' && hasSkill(brief, 'DOTNET')) return '.NET 8 + ASP.NET Core';
  if (hasSkill(brief, 'PHP_LARAVEL')) return 'PHP 8 + Laravel';
  if (hasSkill(brief, 'PYTHON')) return 'Python + FastAPI';
  return 'TypeScript + Node.js modular service';
}

function frontendFor(brief: ArchitecturePlanningInput, packageId: ArchitectureStackPackage['id']) {
  if (brief.productSurface === 'API_SERVICE') return 'API contracts and generated reference documentation';
  if (brief.productSurface === 'STATIC_SITE') return 'Semantic HTML5, CSS, and progressive JavaScript';
  if (packageId === 'LEAN' && !hasSkill(brief, 'REACT_TYPESCRIPT')) return 'HTML5 with server-rendered views and progressive JavaScript';
  if (hasSkill(brief, 'REACT_TYPESCRIPT')) return 'React with TypeScript';
  return packageId === 'LEAN' ? 'HTML5 with lightweight JavaScript' : 'Vue 3 with TypeScript';
}

function mobileFor(brief: ArchitecturePlanningInput, packageId: ArchitectureStackPackage['id']) {
  const mobile = brief.productSurface === 'MOBILE_APP' || brief.productSurface === 'WEB_AND_MOBILE';
  if (!mobile) return 'Responsive web experience; no native app required';
  if (packageId === 'LEAN') return 'Progressive Web App before native distribution';
  if (hasSkill(brief, 'DART_FLUTTER')) return 'Flutter for iOS and Android';
  if (hasSkill(brief, 'REACT_TYPESCRIPT')) return 'React Native with shared TypeScript contracts';
  if (hasSkill(brief, 'SWIFT') && hasSkill(brief, 'KOTLIN')) return 'Native SwiftUI and Kotlin Compose applications';
  return 'Flutter for one cross-platform codebase';
}

function databaseFor(brief: ArchitecturePlanningInput, packageId: ArchitectureStackPackage['id'], backend: string) {
  if (packageId === 'LEAN' && ['PROTOTYPE', 'SMALL'].includes(brief.expectedScale)) return 'SQLite with automated backups';
  if (backend.includes('Laravel') && packageId !== 'SCALE_READY') return 'Managed MySQL';
  return packageId === 'SCALE_READY' ? 'Managed PostgreSQL with backup and read-scaling plan' : 'Managed PostgreSQL';
}

function hostingFor(brief: ArchitecturePlanningInput, packageId: ArchitectureStackPackage['id'], backend: string) {
  if (brief.hostingPreference === 'CONNECT_EXISTING') return `${brief.preferredProvider} connected account with approval-gated setup`;
  if (brief.hostingPreference === 'SELF_HOSTED') return packageId === 'SCALE_READY' ? 'Customer-managed container platform' : 'One customer-managed VPS with Docker and HTTPS';
  if (packageId === 'LEAN' && backend.includes('Laravel')) return 'Managed PHP hosting or a small VPS';
  if (packageId === 'LEAN') return 'Managed application host with one small runtime';
  if (packageId === 'BALANCED') return 'Managed application and database provider';
  return 'AWS, Azure, or GCP managed container platform and database';
}

function moneyRange(brief: ArchitecturePlanningInput, packageId: ArchitectureStackPackage['id']) {
  const maximum = brief.monthlyHostingBudget.maximum;
  const upperFactor = packageId === 'LEAN' ? 0.35 : packageId === 'BALANCED' ? 0.75 : 1;
  const upper = Math.max(1, Math.round(maximum * upperFactor));
  const lower = packageId === 'LEAN' ? 0 : Math.max(1, Math.round(upper * 0.35));
  return `${brief.monthlyHostingBudget.currency} ${lower}–${upper}/month estimate`;
}

export function compileArchitecturePackages(input: {
  projectName: string;
  entities: ArchitecturePlanningEntity[];
  brief: ArchitecturePlanningInput | ArchitectureBrief;
  confirmed: boolean;
}): ArchitectureStackPackage[] {
  const confirmedEntities = input.entities.filter((entity) => entity.truthStatus !== 'UNKNOWN');
  const packages: Array<{ id: ArchitectureStackPackage['id']; name: string; label: string; summary: string }> = [
    { id: 'LEAN', name: 'Lean launch', label: 'Lowest cost', summary: 'The fewest moving parts for a small team and an early release.' },
    { id: 'BALANCED', name: 'Managed product', label: 'Recommended balance', summary: 'A maintainable managed stack with room to grow without operating a platform.' },
    { id: 'SCALE_READY', name: 'Scale-ready foundation', label: 'Higher capacity', summary: 'More operational headroom where measured scale, ownership, or compliance justifies it.' },
  ];
  return packages.map((item) => {
    const aiAssisted = hasSkill(input.brief, 'AI_ASSISTED');
    const backend = backendFor(input.brief, item.id);
    const frontend = frontendFor(input.brief, item.id);
    const database = databaseFor(input.brief, item.id, backend);
    const hosting = hostingFor(input.brief, item.id, backend);
    const isSelected = input.brief.selectedPackageId === item.id;
    return {
      ...item,
      frontend,
      backend,
      database,
      mobile: mobileFor(input.brief, item.id),
      hosting,
      estimatedMonthlyCost: moneyRange(input.brief, item.id),
      why: [
        aiAssisted ? 'No implementation-language preference was supplied; Axiom optimizes the stack for budget, delivery, and operational simplicity.' : `${input.brief.teamSkills.length} confirmed team skill area${input.brief.teamSkills.length === 1 ? '' : 's'} influence the language choices.`,
        `${input.brief.expectedScale.toLowerCase().replace('_', ' ')} scale and ${input.brief.deliveryPriority.toLowerCase().replaceAll('_', ' ')} delivery priority shape the package.`,
        `${confirmedEntities.length} current graph items remain the requirements boundary for ${input.projectName}.`,
      ],
      tradeoffs: item.id === 'LEAN'
        ? ['Lowest operational cost, but limited independent scaling.', 'SQLite or a single runtime requires disciplined backups and migration triggers.']
        : item.id === 'BALANCED'
          ? ['Managed services cost more than a single server.', 'Provider portability depends on keeping application boundaries explicit.']
          : ['Highest platform and observability burden.', 'Should not be selected without measured scale or team ownership evidence.'],
      connectionSteps: input.brief.hostingPreference === 'CONNECT_EXISTING'
        ? [`Connect ${input.brief.preferredProvider} through its approved account flow.`, 'Select the billing scope and deployment region.', 'Review the resource and cost plan before creation.']
        : input.brief.hostingPreference === 'SELF_HOSTED'
          ? ['Provide a server endpoint without sharing root credentials.', 'Install an approved deployment runner.', 'Review network, backup, and rollback prerequisites.']
          : ['Choose a recommended provider after reviewing cost and lock-in.', 'Create or connect the account.', 'Approve the generated resource plan before any external write.'],
      automationPlan: ['Generate repository and environment manifest', 'Generate database migrations and backup policy', 'Generate CI/CD and rollback workflow', 'Generate domain, HTTPS, monitoring, and secret checklist'],
      validation: [
        { label: 'Budget fit', status: input.confirmed ? 'SUPPORTED' : 'ASSUMPTION', detail: input.confirmed ? `Package is bounded by the confirmed ${input.brief.monthlyHostingBudget.currency} ${input.brief.monthlyHostingBudget.maximum}/month ceiling.` : 'Save the budget before treating cost fit as supported.' },
        { label: 'Team fit', status: input.confirmed && !aiAssisted ? 'SUPPORTED' : 'ASSUMPTION', detail: aiAssisted ? 'Axiom can prepare the implementation, but code review and production ownership still require a capable human.' : input.confirmed ? `Recommendation uses the ${input.brief.teamSkills.join(', ')} skills supplied by the user.` : 'Team skills are provisional.' },
        { label: 'Runtime proof', status: 'NEEDS_EVIDENCE', detail: 'Performance, reliability, security, and actual cost require deployed measurements.' },
        { label: 'Selection', status: isSelected && input.confirmed ? 'SUPPORTED' : 'ASSUMPTION', detail: isSelected ? 'This is the user-selected package.' : 'This remains a comparable alternative.' },
      ],
      truthStatus: 'AI_SUGGESTED',
    };
  });
}
