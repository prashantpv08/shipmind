import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { VerificationReport, type VerificationReport as VerificationReportType } from './schemas';

const defaultDataRoot = process.env.AXIOM_DATA_DIR
  ? resolve(process.env.AXIOM_DATA_DIR)
  : join(/* turbopackIgnore: true */ process.cwd(), '.axiom-data');

function storageName(report: VerificationReportType) {
  return createHash('sha256').update(`${report.generationId}:${report.id}`).digest('hex');
}

export async function persistVerificationReport(value: unknown, dataRoot = defaultDataRoot) {
  const report = VerificationReport.parse(value);
  const root = join(resolve(dataRoot), 'verification');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const destination = join(root, `${storageName(report)}.json`);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(report, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(temporary, destination);
  return report;
}
