import type { ProjectGap } from './schemas';
import type { WireframeTemplate } from './wireframe-templates';

export type WireframeTemplatePreviewEntity = {
  id: string;
  category: string;
  text: string;
  truthStatus: string;
};

export type WireframeTemplatePreviewContext = {
  projectName: string;
  entities: WireframeTemplatePreviewEntity[];
  gaps: ProjectGap[];
};

export type WireframeTemplatePreview = {
  projectName: string;
  templateId: WireframeTemplate['id'];
  mappedEntityCount: number;
  openGapCount: number;
  screens: Array<WireframeTemplate['screens'][number] & {
    title: string;
    mappedItems: Array<Pick<WireframeTemplatePreviewEntity, 'id' | 'text' | 'truthStatus'>>;
    openGapTitles: string[];
  }>;
};

function projectSubject(projectName: string) {
  const normalized = projectName.replaceAll('-', ' ').replace(/\b(portal|platform|service|system|application|app|product)\b/gi, '').replace(/\s+/g, ' ').trim();
  return normalized || projectName.replaceAll('-', ' ');
}

function contextualTitle(title: string, projectName: string) {
  const subject = projectSubject(projectName);
  const replacements: Record<string, string> = {
    'Workspace overview': `${subject} overview`,
    Records: `${subject} records`,
    'Record detail': `${subject} detail`,
    'Command center': `${subject} command center`,
  };
  return replacements[title] ?? title;
}

export function compileWireframeTemplatePreview(template: WireframeTemplate, context: WireframeTemplatePreviewContext): WireframeTemplatePreview {
  const entities = context.entities.filter((entity) => entity.truthStatus !== 'UNKNOWN' && entity.category !== 'OPEN_QUESTION');
  const gaps = context.gaps.filter((gap) => gap.status === 'OPEN');
  const screens = template.screens.map((screen, index) => ({
    ...screen,
    title: contextualTitle(screen.title, context.projectName),
    mappedItems: entities
      .filter((_, entityIndex) => entityIndex % template.screens.length === index)
      .slice(0, 2)
      .map(({ id, text, truthStatus }) => ({ id, text, truthStatus })),
    openGapTitles: gaps.filter((_, gapIndex) => gapIndex % template.screens.length === index).map((gap) => gap.title),
  }));
  return {
    projectName: context.projectName,
    templateId: template.id,
    mappedEntityCount: entities.length,
    openGapCount: gaps.length,
    screens,
  };
}
