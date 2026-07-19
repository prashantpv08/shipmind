import { describe, expect, it } from 'vitest';
import { ProjectGap, KnowledgeEntity } from '../src/projects/schemas';
import { compileWireframeTemplatePreview } from '../src/projects/wireframe-template-preview';
import { getWireframeTemplate } from '../src/projects/wireframe-templates';

describe('project-aware wireframe template previews', () => {
  it('maps confirmed graph context and open gaps into all four template screens', () => {
    const entities = [
      { id: 'REQ-1', projectId: 'PROJ-1', category: 'REQUIREMENT', text: 'Recruiters schedule interviews.', truthStatus: 'SOURCE_GROUNDED', sourceId: 'SRC-1', quote: 'Recruiters schedule interviews.', startOffset: 0, endOffset: 31 },
      { id: 'NFR-1', projectId: 'PROJ-1', category: 'NFR', text: 'P95 response time must remain below 300 ms.', truthStatus: 'HUMAN_CONFIRMED', clarificationQuestionId: 'CQ-1' },
      { id: 'REQ-2', projectId: 'PROJ-1', category: 'REQUIREMENT', text: 'Interviewers review AI alerts.', truthStatus: 'HUMAN_CONFIRMED', clarificationQuestionId: 'CQ-2' },
      { id: 'UNKNOWN-1', projectId: 'PROJ-1', category: 'OPEN_QUESTION', text: 'Unknown placeholder.', truthStatus: 'UNKNOWN' },
    ].map((entity) => KnowledgeEntity.parse(entity));
    const gaps = [ProjectGap.parse({ id: 'GAP-1', projectId: 'PROJ-1', type: 'MISSING', category: 'DELIVERY', title: 'Operating ownership', description: 'Ownership is open.', severity: 'MEDIUM', impactAreas: ['delivery'], affectedEntityIds: [], affectedArtifacts: ['HLD'], rationale: 'Ownership changes the operating model.', status: 'OPEN', truthStatus: 'UNKNOWN' })];
    const preview = compileWireframeTemplatePreview(getWireframeTemplate('saas-admin'), { projectName: 'Interview-Portal', entities, gaps });

    expect(preview.screens).toHaveLength(4);
    expect(preview.screens[0].title).toBe('Interview overview');
    expect(preview.mappedEntityCount).toBe(3);
    expect(preview.openGapCount).toBe(1);
    expect(preview.screens.flatMap((screen) => screen.mappedItems.map((item) => item.text))).toEqual(expect.arrayContaining(['Recruiters schedule interviews.', 'Interviewers review AI alerts.']));
    expect(preview.screens.flatMap((screen) => screen.openGapTitles)).toEqual(['Operating ownership']);
  });

  it('changes the preview content when the active project changes', () => {
    const template = getWireframeTemplate('operations-console');
    const makeEntity = (projectId: string, text: string) => [KnowledgeEntity.parse({ id: `REQ-${projectId}`, projectId, category: 'REQUIREMENT', text, truthStatus: 'HUMAN_CONFIRMED', clarificationQuestionId: `CQ-${projectId}` })];
    const interviews = compileWireframeTemplatePreview(template, { projectName: 'Interview-Portal', entities: makeEntity('INTERVIEW', 'Monitor live interview alerts.'), gaps: [] });
    const notifications = compileWireframeTemplatePreview(template, { projectName: 'NotifyFlow', entities: makeEntity('NOTIFY', 'Retry failed notification deliveries.'), gaps: [] });

    expect(interviews.screens[0].title).toBe('Interview command center');
    expect(interviews.screens[0].mappedItems[0].text).toContain('interview');
    expect(notifications.screens[0].mappedItems[0].text).toContain('notification');
    expect(interviews.screens[0].mappedItems[0].text).not.toBe(notifications.screens[0].mappedItems[0].text);
  });
});
