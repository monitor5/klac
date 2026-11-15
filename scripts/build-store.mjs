// Builds the Chrome Web Store upload zip.
//   node scripts/build-store.mjs              -> dist/klap-<version>-store.zip (lecture auto-progress viewer excluded)
//   node scripts/build-store.mjs --with-viewer -> dist/klap-<version>-full.zip  (same as the GitHub source)
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const withViewer = process.argv.includes('--with-viewer');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const flavor = withViewer ? 'full' : 'store';
const stage = join(root, 'dist', flavor);
const zip = join(root, 'dist', `klap-${manifest.version}-${flavor}.zip`);

rmSync(stage, { recursive: true, force: true });
rmSync(zip, { force: true });
mkdirSync(stage, { recursive: true });

const include = ['_locales', 'icons', 'popup', 'src', 'LICENSE', 'THIRD_PARTY_NOTICES.md'];
if (withViewer) include.push('viewer');
for (const entry of include) cpSync(join(root, entry), join(stage, entry), { recursive: true });

if (!withViewer) {
  manifest.content_scripts = (manifest.content_scripts || []).filter(cs => !cs.js?.some(f => f.startsWith('viewer/')));
  if (!manifest.content_scripts.length) delete manifest.content_scripts;
}
writeFileSync(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

execFileSync('zip', ['-qrX', zip, '.', '-x', '.*', '*/.*'], { cwd: stage });
console.log(`built ${zip}`);
