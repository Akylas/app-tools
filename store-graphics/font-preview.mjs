// Renders a slide with several fonts side by side, to pick one (`theme.font` and `theme.titleWeight` in slides.json).
//
//   node tools/store-graphics/font-preview.mjs "Outfit:800" "Space Grotesk:700" [--app cardwallet] [--target ios-phone]
//
// only the families of `osg call list_fonts` exist (a missing one falls back to a serif); `:weight` is the weight of the title.
// Output: .cache/fonts.png
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildProject } from './build-project.mjs';
import { STORE, bin, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const fonts = args._;
const app = args.app ?? 'cardwallet';
const target = args.target ?? 'ios-phone';
const cache = join(STORE, '.cache');
mkdirSync(cache, { recursive: true });
const cells = [];
for (const entry of fonts) {
    const [font, titleWeight] = entry.split(':');
    const project = await buildProject(app, target, { withShots: true, font, titleWeight });
    project.projectData = project.projectData.filter((board) => ['cards'].includes(board.name));
    const path = join(cache, 'font-preview.json');
    writeFileSync(path, JSON.stringify(project));
    const out = mkdtempSync(join(tmpdir(), 'osg-font-'));
    spawnSync(bin('open-screenshot-generator'), ['render', '--project', path, '--formats', 'as-is', '--out', out, '--quiet'], { stdio: 'inherit' });
    for (const file of readdirSync(out).filter((name) => name.endsWith('.png')).sort()) {
        const image = await sharp(join(out, file)).resize(330).png().toBuffer();
        const label = Buffer.from(`<svg width="330" height="44"><rect width="330" height="44" fill="#111"/><text x="165" y="30" font-size="22" font-family="Helvetica" fill="#fff" text-anchor="middle">${entry.replace(/&/g, '&amp;')}</text></svg>`);
        cells.push({ image, label });
    }
}
const rows = [];
const cellHeight = 44 + Math.round((330 * 2868) / 1320);
const columns = cells.length;
const sheet = sharp({ create: { width: columns * 336, height: cellHeight, channels: 3, background: '#222' } });
const composite = [];
cells.forEach((cell, index) => {
    composite.push({ input: cell.label, left: index * 336, top: 0 }, { input: cell.image, left: index * 336, top: 44 });
});
await sheet.composite(composite).png().toFile(join(cache, 'fonts.png'));
console.log('wrote .cache/fonts.png', fonts.join(', '));
