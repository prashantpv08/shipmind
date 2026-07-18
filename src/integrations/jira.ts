import { randomUUID } from 'node:crypto';
import { JiraPublication, type JiraBacklogPlan, type JiraPublication as JiraPublicationType } from '../projects/schemas';

type JiraIssueType = { id: string; name: string; subtask?: boolean };
type JiraIssue = { id: string; key: string; self: string };
type JiraAccount = { displayName?: string };

export function jiraStatus() {
  const missing = [
    !process.env.JIRA_BASE_URL ? 'JIRA_BASE_URL' : null,
    !process.env.JIRA_EMAIL ? 'JIRA_EMAIL' : null,
    !process.env.JIRA_API_TOKEN ? 'JIRA_API_TOKEN' : null,
    !process.env.JIRA_PROJECT_KEY ? 'JIRA_PROJECT_KEY' : null,
  ].filter((value): value is string => Boolean(value));
  return { configured: missing.length === 0, mode: 'jira-cloud-api-token' as const, missing };
}

function configuration() {
  const status = jiraStatus();
  if (!status.configured) throw new Error(`Jira is not configured: ${status.missing.join(', ')} missing`);
  const baseUrl = new URL(process.env.JIRA_BASE_URL as string);
  if (baseUrl.protocol !== 'https:') throw new Error('JIRA_BASE_URL must use HTTPS');
  return {
    baseUrl: baseUrl.toString().replace(/\/$/, ''),
    email: process.env.JIRA_EMAIL as string,
    token: process.env.JIRA_API_TOKEN as string,
    projectKey: process.env.JIRA_PROJECT_KEY as string,
  };
}

async function jiraRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const config = configuration();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      authorization: `Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'errorMessages' in payload && Array.isArray(payload.errorMessages)
      ? payload.errorMessages.join('; ')
      : `Jira request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

function adf(paragraphs: string[]) {
  return {
    type: 'doc', version: 1,
    content: paragraphs.filter(Boolean).map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
  };
}

async function issueTypes(projectKey: string) {
  const payload = await jiraRequest<{ issueTypes?: JiraIssueType[]; values?: JiraIssueType[] }>('GET', `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes?maxResults=50`);
  const available = payload.issueTypes ?? payload.values ?? [];
  const epic = available.find((item) => item.name.toLowerCase() === 'epic');
  const story = available.find((item) => item.name.toLowerCase() === 'story')
    ?? available.find((item) => item.name.toLowerCase() === 'task' && !item.subtask);
  if (!epic || !story) throw new Error('The configured Jira project must expose Epic and Story or Task issue types');
  return { epic, story };
}

function safeConnectionError(cause: unknown) {
  let message = cause instanceof Error ? cause.message : String(cause);
  for (const sensitive of [process.env.JIRA_API_TOKEN, process.env.JIRA_EMAIL].filter((value): value is string => Boolean(value))) {
    message = message.replaceAll(sensitive, '[redacted]');
  }
  return message.slice(0, 500);
}

export async function verifyJiraConnection() {
  const status = jiraStatus();
  if (!status.configured) return { ...status, connected: false as const };
  try {
    const config = configuration();
    const [account, types] = await Promise.all([
      jiraRequest<JiraAccount>('GET', '/rest/api/3/myself'),
      issueTypes(config.projectKey),
    ]);
    return {
      ...status,
      connected: true as const,
      projectKey: config.projectKey,
      accountName: account.displayName ?? 'Jira user',
      issueTypes: [types.epic.name, types.story.name],
    };
  } catch (cause) {
    return {
      ...status,
      connected: false as const,
      projectKey: process.env.JIRA_PROJECT_KEY,
      error: safeConnectionError(cause),
    };
  }
}

export async function publishJiraBacklog(plan: JiraBacklogPlan, previousPublication?: JiraPublicationType | null) {
  if (previousPublication?.planHash === plan.sha256 && previousPublication.sourceGraphVersion === plan.sourceGraphVersion) return previousPublication;
  const config = configuration();
  const types = await issueTypes(config.projectKey);
  const epic = await jiraRequest<JiraIssue>('POST', '/rest/api/3/issue', {
    fields: {
      project: { key: config.projectKey },
      issuetype: { id: types.epic.id },
      summary: plan.epic.summary,
      description: adf([plan.epic.description, `Axiom plan ${plan.id} · graph v${plan.sourceGraphVersion}`]),
      labels: ['axiom', 'axiom-approved-baseline'],
    },
  });
  const stories: Array<{ localId: string; key: string; url: string }> = [];
  for (const story of plan.stories) {
    const issue = await jiraRequest<JiraIssue>('POST', '/rest/api/3/issue', {
      fields: {
        project: { key: config.projectKey },
        issuetype: { id: types.story.id },
        parent: { key: epic.key },
        summary: story.summary,
        description: adf([
          story.description,
          `Acceptance criteria: ${story.acceptanceCriteria.join(' | ')}`,
          `Source entities: ${story.sourceEntityIds.join(', ') || 'UNKNOWN'}`,
          `Truth status: ${story.truthStatus}`,
        ]),
        labels: ['axiom', `axiom-graph-${plan.sourceGraphVersion}`],
      },
    });
    stories.push({ localId: story.localId, key: issue.key, url: `${config.baseUrl}/browse/${issue.key}` });
  }
  return JiraPublication.parse({
    id: `JIRA-PUB-${randomUUID()}`,
    projectId: plan.projectId,
    sourceGraphVersion: plan.sourceGraphVersion,
    planId: plan.id,
    planHash: plan.sha256,
    projectKey: config.projectKey,
    epicKey: epic.key,
    epicUrl: `${config.baseUrl}/browse/${epic.key}`,
    stories,
    createdAt: new Date().toISOString(),
  });
}
