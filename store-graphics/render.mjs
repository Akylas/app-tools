// Renders the store images with the Open Screenshot Generator CLI and writes them where fastlane expects them.
//
//   node tools/store-graphics/render.mjs                     every app, store slot and locale (locales/*.json)
//   ... --app cardwallet --target ios-phone --locales en-US,fr-FR
//   ... --fastlane /tmp/fastlane                             try without touching the repo
//
// One osg project per app (build-project.mjs) with the captures embedded, rendered once per store format
// (iPhone 6.9", iPad 13", Play phone, Play 10" tablet) and once for the feature graphic.
// captures: <store dir>/raw/<locale>/<app>/<target>/*.png (capture.mjs). A locale without captures uses the ones of en-US.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildApp } from './build-project.mjs';
import { STORE, TARGETS, bin, fastlaneDir, locales, parseArgs, slidesConfig } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const wanted = (args.locales ?? Object.keys(locales()).join(',')).split(',');
const appDir = (app) => (args.fastlane ? join(args.fastlane, slidesConfig()[app].id) : fastlaneDir(app));
const cache = join(STORE, '.cache');
mkdirSync(cache, { recursive: true });

function osgRender(projectPath, out, extra) {
    const result = spawnSync(bin('open-screenshot-generator'), ['render', '--project', projectPath, '--locales', wanted.join(','), '--out', out, '--quiet', ...extra], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`osg render failed (${result.status})`);
}

const jpeg = (file) => sharp(file).jpeg({ quality: 82, chromaSubsampling: '4:2:0', mozjpeg: true }).toBuffer();
/** osg prefixes the locale only when it renders several */
const parse = (file) => file.match(/^(?:(?<locale>[A-Za-z]{2,3}-[A-Za-z0-9]+)_)?(?<n>\d+)_(?<id>[a-z0-9-]+?)_.*_(?<w>\d+)x(?<h>\d+)\.png$/);

for (const app of args.app ? [args.app] : Object.keys(slidesConfig())) {
    const { project, formats, feature } = await buildApp(app, { withShots: true });
    // osg renders every artboard of a project: one project file per store slot with only the artboards that have captures
    const subset = (ids, name) => {
        const path = join(cache, `${app}-${name}.json`);
        writeFileSync(path, JSON.stringify({ ...project, projectData: project.projectData.filter((board) => ids.includes(board.id)) }));
        return path;
    };
    for (const target of args.target && args.target !== 'feature' ? [args.target] : args.target ? [] : Object.keys(TARGETS)) {
        const cfg = TARGETS[target];
        const ids = formats[target];
        if (!ids.length) continue;
        const out = mkdtempSync(join(tmpdir(), 'osg-out-'));
        osgRender(subset(ids, target), out, ['--formats', cfg.format]);
        for (const file of readdirSync(out).filter((name) => name.endsWith('.png')).sort()) {
            const match = parse(file);
            if (!match) continue;
            const locale = match.groups.locale ?? wanted[0];
            const id = match.groups.id;
            const n = ids.findIndex((boardId) => boardId === `${app}-${id}`) + 1;
            if (n < 1) continue;
            const dir = join(appDir(app), cfg.folder.replace('{locale}', locale));
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, cfg.name.replace('{nn}', String(n).padStart(2, '0')).replace('{n}', n).replace('{id}', id).replace('{locale}', locale)), await jpeg(join(out, file)));
        }
        console.log(app, target, ids.length, 'slides ->', wanted.join(','));
    }
    if (!args.target || args.target === 'feature') {
        // the feature graphic is small: draw it twice as big and scale down, otherwise the phones are soft
        const out = mkdtempSync(join(tmpdir(), 'osg-out-'));
        osgRender(subset([feature], 'feature'), out, ['--formats', 'as-is', '--scale', '2']);
        for (const file of readdirSync(out).filter((name) => name.endsWith('.png'))) {
            const locale = file.match(/^([A-Za-z]{2,3}-[A-Za-z0-9]+)_/)?.[1] ?? wanted[0];
            const dir = join(appDir(app), 'android', locale, 'images');
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, 'featureGraphic.png'), await sharp(join(out, file)).resize(1024, 500, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer());
        }
        console.log(app, 'feature ->', wanted.join(','));
    }
}
