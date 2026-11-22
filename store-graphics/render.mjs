// Renders the store images with the Open Screenshot Generator CLI and writes them where fastlane expects them.
//
//   node tools/store-graphics/render.mjs                     every app, target and locale (locales/*.json)
//   ... --app cardwallet --target ios-phone --locales en-US,fr-FR
//   ... --fastlane /tmp/fastlane                             try without touching the repo
//
// captures: raw/<locale>/<app>/<target>/*.png (capture.mjs). A locale without captures
// uses the ones of the base locale (en-US) with its texts translated.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildFeature, buildProject } from './build-project.mjs';
import { STORE, TARGETS, bin, fastlaneDir, locales, parseArgs, slidesConfig } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const wanted = (args.locales ?? Object.keys(locales()).join(',')).split(',');
const appDir = (app) => (args.fastlane ? join(args.fastlane, slidesConfig()[app].id) : fastlaneDir(app));
const cache = join(STORE, '.cache');
mkdirSync(cache, { recursive: true });

function osgRender(projectPath, out, scale = 1) {
    const result = spawnSync(bin('open-screenshot-generator'), ['render', '--project', projectPath, '--formats', 'as-is', '--locales', wanted.join(','), '--out', out, '--scale', String(scale), '--quiet'], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`osg render failed (${result.status})`);
}

const jpeg = (buffer) => sharp(buffer).jpeg({ quality: 80, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();

for (const app of args.app ? [args.app] : Object.keys(slidesConfig())) {
    for (const target of args.target ? [args.target] : [...Object.keys(TARGETS), 'feature']) {
        const project = target === 'feature' ? await buildFeature(app, { withShots: true }) : await buildProject(app, target, { withShots: true });
        if (!project.projectData.length) continue;
        const projectPath = join(cache, `${app}-${target}.json`);
        writeFileSync(projectPath, JSON.stringify(project));
        const out = mkdtempSync(join(tmpdir(), 'osg-out-'));
        // the feature graphic is small: draw it twice as big and scale down, otherwise the phones are soft
        osgRender(projectPath, out, target === 'feature' ? 2 : 1);
        for (const file of readdirSync(out).filter((name) => name.endsWith('.png')).sort()) {
            const match = file.match(/^(?:(?<locale>[A-Za-z]{2,3}-[A-Za-z0-9]+)_)?(?<n>\d+)_(?<id>[a-z0-9-]+?)_/);
            if (!match) continue;
            // osg only prefixes the locale when it renders several
            const locale = match.groups.locale ?? wanted[0];
            const { id } = match.groups;
            const n = Number(match.groups.n);
            if (target === 'feature') {
                const dir = join(appDir(app), 'android', locale, 'images');
                mkdirSync(dir, { recursive: true });
                writeFileSync(join(dir, 'featureGraphic.png'), await sharp(join(out, file)).resize(1024, 500, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer());
                continue;
            }
            const cfg = TARGETS[target];
            const dir = join(appDir(app), cfg.folder.replace('{locale}', locale));
            mkdirSync(dir, { recursive: true });
            const name = cfg.name.replace('{nn}', String(n).padStart(2, '0')).replace('{n}', n).replace('{id}', id).replace('{locale}', locale);
            writeFileSync(join(dir, name), await jpeg(join(out, file)));
        }
        console.log(app, target, project.projectData.length, 'boards ->', wanted.join(','));
    }
}
