import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import { put } from '@vercel/blob';
import mammoth from 'mammoth';
import { extractText as extractPdfText, getDocumentProxy } from 'unpdf';
import { ProjectSource, type ProjectSource as ProjectSourceType } from './schemas';
import { projectDataRoot, projectUsesBlobStorage } from './store';

export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_PROJECT_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_EXTRACTED_CHARACTERS = 250_000;

function safeName(name: string) {
  const cleaned = basename(name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'source';
}

async function extractText(buffer: Buffer, name: string, mimeType: string) {
  const extension = extname(name).toLowerCase();
  if (mimeType === 'application/pdf' || extension === '.pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    try {
      const result = await extractPdfText(pdf, { mergePages: true });
      return result.text;
    } finally {
      await pdf.destroy();
    }
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType.startsWith('text/') || ['.md', '.txt', '.csv', '.json', '.yaml', '.yml'].includes(extension)) {
    return buffer.toString('utf8');
  }
  throw new Error('Unsupported source type. Use PDF, DOCX, Markdown, text, CSV, JSON, or YAML.');
}

export async function persistUploadedSource(input: {
  workspaceId: string;
  projectId: string;
  file: File;
  relativePath?: string;
  kind?: 'FILE' | 'FOLDER_FILE' | 'MEETING_TRANSCRIPT';
}): Promise<ProjectSourceType> {
  if (input.file.size > MAX_SOURCE_BYTES) throw new Error(`${input.file.name} exceeds the 10 MB source limit`);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const id = `SRC-${randomUUID()}`;
  let rawPath: string;
  if (projectUsesBlobStorage()) {
    const blobPath = `axiom/uploads/${input.workspaceId}/${input.projectId}/${id}/${safeName(input.file.name)}`;
    const blob = await put(blobPath, buffer, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
      contentType: input.file.type || 'application/octet-stream',
    });
    rawPath = blob.pathname;
  } else {
    const uploadRoot = resolve(projectDataRoot(), 'uploads', input.workspaceId, input.projectId, id);
    const localPath = join(uploadRoot, safeName(input.file.name));
    if (relative(projectDataRoot(), localPath).startsWith('..')) throw new Error('Source path escaped the project data root');
    await mkdir(uploadRoot, { recursive: true, mode: 0o700 });
    await writeFile(localPath, buffer, { flag: 'wx', mode: 0o600 });
    rawPath = relative(projectDataRoot(), localPath);
  }

  let extractedText = '';
  let status: 'EXTRACTED' | 'FAILED' = 'EXTRACTED';
  let extractionError: string | undefined;
  try {
    extractedText = (await extractText(buffer, input.file.name, input.file.type || 'application/octet-stream')).trim();
    if (!extractedText) throw new Error('No readable text was found in the source');
    if (extractedText.length > MAX_EXTRACTED_CHARACTERS) extractedText = extractedText.slice(0, MAX_EXTRACTED_CHARACTERS);
  } catch (cause) {
    status = 'FAILED';
    extractionError = cause instanceof Error ? cause.message : String(cause);
  }

  return ProjectSource.parse({
    id,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    name: input.file.name,
    relativePath: input.relativePath || undefined,
    kind: input.kind ?? (input.relativePath ? 'FOLDER_FILE' : 'FILE'),
    mimeType: input.file.type || 'application/octet-stream',
    size: buffer.byteLength,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    extractedText,
    rawPath,
    status,
    extractionError,
    createdAt: new Date().toISOString(),
  });
}
