import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const root = fileURLToPath(new URL('./', import.meta.url));

function findUp(path: string) {
  let dir = root;
  while (true) {
    const candidate = join(dir, 'node_modules', path);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`${path} fehlt, bitte zuerst npm install ausführen`);
    dir = parent;
  }
}

const source = readFileSync(`${root}src/moepulse.ts`, 'utf8');
const stripped = await format(stripTypeScriptTypes(source, { mode: 'strip' }), {
  parser: 'babel',
  printWidth: 140,
  singleQuote: true,
  trailingComma: 'es5',
});

rmSync(`${root}dist`, { recursive: true, force: true });
mkdirSync(`${root}dist`, { recursive: true });
writeFileSync(`${root}dist/moepulse.mjs`, stripped);
execFileSync(
  process.execPath,
  [
    findUp('typescript/bin/tsc'),
    `${root}src/moepulse.ts`,
    '--declaration',
    '--emitDeclarationOnly',
    '--outDir',
    `${root}dist`,
    '--module',
    'nodenext',
    '--moduleResolution',
    'nodenext',
    '--target',
    'es2023',
    '--types',
    'node',
    '--skipLibCheck',
    '--allowImportingTsExtensions',
    '--ignoreConfig',
  ],
  { stdio: 'inherit' }
);
const types = readFileSync(`${root}dist/moepulse.d.ts`, 'utf8');
rmSync(`${root}dist/moepulse.d.ts`);
writeFileSync(
  `${root}dist/moepulse.d.mts`,
  await format(types, { parser: 'typescript', printWidth: 140, singleQuote: true, trailingComma: 'es5' })
);
process.stdout.write(`SDK gebaut: sdk/dist/moepulse.mjs (${Math.round(stripped.length / 1024)} KB) und sdk/dist/moepulse.d.mts\n`);
