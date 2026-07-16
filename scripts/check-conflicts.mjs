import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.endsWith('.docx') && !file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.jpeg') && !file.endsWith('.gif'));

const markers = ['<<<<<<<', '=======', '>>>>>>>'];
const hits = [];

for (const file of files) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (markers.some((marker) => line.startsWith(marker))) {
      hits.push(`${file}:${index + 1}: ${line}`);
    }
  });
}

if (hits.length > 0) {
  console.error('Unresolved merge conflict markers found:');
  console.error(hits.join('\n'));
  process.exit(1);
}

console.log(`No unresolved merge conflict markers found in ${files.length} tracked text files.`);
