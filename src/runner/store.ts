import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { put } from '@vercel/blob';
import { VerificationReport, type VerificationReport as VerificationReportType } from './schemas';

const defaultDataRoot = process.env.AXIOM_DATA_DIR
  ? resolve(process.env.AXIOM_DATA_DIR)
  : join(/* turbopackIgnore: true */ process.cwd(), '.axiom-data');

function storageName(report: VerificationReportType) {
  return createHash('sha256').update(`${report.generationId}:${report.id}`).digest('hex');
}

export async function persistVerificationReport(value: unknown, dataRoot = defaultDataRoot) {
  const report = VerificationReport.parse(value);
  if (process.env.VERCEL && dataRoot === defaultDataRoot) {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) {
      throw new Error('Vercel Blob is not connected for verification evidence persistence.');
    }
    await put(`axiom/verification/${storageName(report)}.json`, JSON.stringify(report), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: 'application/json',
    });
    return report;
  }
  const root = join(resolve(dataRoot), 'verification');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const destination = join(root, `${storageName(report)}.json`);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(report, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(temporary, destination);
  return report;
}
