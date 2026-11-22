// Builds Open Screenshot Generator projects (https://github.com/dotnetdreamer/open-screenshot-generator)
// from slides.json + locales/*.json (+ the raw captures made by maestro).
//
//   node tools/store-graphics/build-project.mjs   -> <store dir>/templates/<app>-<target>.json (no captures: empty device frames, committed)
//   import { buildProject } from './build-project.mjs'   (used by render.mjs, with the captures embedded)
//
// One artboard per slide, sized like the store slot of the target. Languages are overlays: artboard.localized[locale][elementId].
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { BASE_LOCALE, REPO, STORE, TARGETS, locales, parseArgs, rawDir, slidesConfig } from './lib.mjs';

const DEFAULT_FONT = 'Bricolage Grotesque';
let FONT = DEFAULT_FONT; // set per project from the theme (slides.json) before building
let TITLE_WEIGHT = '800';
const TEXT_UNIT = 0.3; // osg draws text at fontSize / 0.3 artboard px

const fontSize = (px) => Math.round(px * TEXT_UNIT * 100) / 100;

function makeIds(prefix) {
    let count = 0;
    return (kind) => `${prefix}-${kind}${++count}`;
}

function text(ids, name, content, x, y, w, h, px, color, weight = '700', align = 'center', lineHeight = 1.08) {
    return {
        id: ids('t'),
        type: 'text',
        name,
        position: { x: Math.round(x), y: Math.round(y) },
        size: { width: Math.round(w), height: Math.round(h) },
        rotation: 0,
        scale: 1,
        content,
        fontSize: fontSize(px),
        color,
        fontFamily: FONT,
        fontWeight: weight,
        fontStyle: 'normal',
        textAlign: align,
        lineHeight
    };
}

function shape(ids, name, kind, x, y, w, h, fill, opacity = 1, { radius, blur, stroke = 'transparent', strokeWidth = 0, rotation = 0 } = {}) {
    const element = {
        id: ids('s'),
        type: 'shape',
        name,
        position: { x: Math.round(x), y: Math.round(y) },
        size: { width: Math.round(w), height: Math.round(h) },
        rotation,
        scale: 1,
        shapeType: kind,
        fillColor: fill,
        strokeColor: stroke,
        strokeWidth,
        fillOpacity: opacity
    };
    if (radius !== undefined) element.borderRadius = radius;
    if (blur) element.blur = blur;
    return element;
}

function device(ids, name, cfg, x, y, w, rotation, screenshot) {
    const element = {
        id: ids('d'),
        type: 'device',
        name,
        position: { x: Math.round(x), y: Math.round(y) },
        size: { width: Math.round(w), height: Math.round((w / cfg.aspect) * 100) / 100 },
        rotation,
        scale: 1,
        deviceType: cfg.device,
        styleType: 'normal',
        frameColor: '#1C1C1E',
        screenshotObjectFit: 'cover',
        screenshotRect: { left: 0, top: 0, width: 100, height: 100 },
        shadow: { x: 0, y: Math.round(w * 0.03), blur: Math.round(w * 0.07), color: 'rgba(0,0,0,0.45)' }
    };
    if (screenshot) element.screenshotSrc = screenshot;
    return element;
}

/** centered rows of pills (wraps): dark glass with a light edge, readable on any background. Returns [elements, bottom y] */
function pills(ids, labels, y, width, px, theme, maxWidth = width * 0.9) {
    const elements = [];
    const gap = px * 0.7;
    const height = px * 2;
    const widths = labels.map((label) => label.length * px * 0.62 + px * 2.8);
    const rows = [[]];
    let rowWidth = 0;
    widths.forEach((w, index) => {
        if (rows.at(-1).length && rowWidth + gap + w > maxWidth) {
            rows.push([]);
            rowWidth = 0;
        }
        rows.at(-1).push(index);
        rowWidth += w + (rows.at(-1).length > 1 ? gap : 0);
    });
    rows.forEach((row, rowIndex) => {
        let x = (width - (row.reduce((sum, i) => sum + widths[i], 0) + gap * (row.length - 1))) / 2;
        const top = y + rowIndex * (height + gap);
        for (const i of row) {
            const w = widths[i];
            elements.push(shape(ids, `Pill ${i + 1}`, 'rectangle', x, top, w, height, '#000000', 0.34, { radius: height / 2, stroke: 'rgba(255,255,255,0.45)', strokeWidth: 2 }));
            elements.push(text(ids, `Pill text ${i + 1}`, labels[i], x, top + height / 2 - px * 0.62, w, px * 1.3, px, '#FFFFFF', '600', 'center', 1));
            x += w + gap;
        }
    });
    return [elements, y + rows.length * (height + gap) - gap];
}

function board(app, index, slide, copy, theme, target, cfg, shots) {
    const [width, height] = cfg.size;
    const ids = makeIds(`b${index}`);
    const elements = [];
    // aurora: blurred color blobs
    [
        [0.98, 0.02, 0.62, 0.8],
        [0.0, 0.42, 0.5, 0.6],
        [0.95, 0.74, 0.62, 0.65],
        [0.1, 0.98, 0.55, 0.5]
    ].forEach(([fx, fy, fr, opacity], blob) => {
        const r = fr * width;
        elements.push(shape(ids, 'Aurora', 'circle', fx * width - r, fy * height - r, 2 * r, 2 * r, theme.blobs[blob % theme.blobs.length], opacity, { blur: Math.round(width * 0.16) }));
    });
    // title: a line holding a *marked* word is drawn in the accent color
    const lines = copy.title.split('\n');
    const longest = Math.max(...lines.map((line) => line.replace(/\*/g, '').length));
    const titlePx = Math.min(width * 0.1, (width * 0.88) / (longest * 0.56));
    let y = height * (cfg.tablet ? 0.05 : 0.058);
    lines.forEach((line, lineIndex) => {
        elements.push(text(ids, `Title ${lineIndex + 1}`, line.replace(/\*/g, ''), width * 0.05, y, width * 0.9, titlePx * 1.25, titlePx, line.includes('*') ? theme.accent : theme.title, TITLE_WEIGHT));
        y += titlePx * 1.12;
    });
    const subPx = width * 0.04;
    if (copy.subtitle) {
        y += titlePx * 0.1;
        elements.push(text(ids, 'Subtitle', copy.subtitle, width * 0.05, y, width * 0.9, subPx * 1.4, subPx, theme.subtitle, '500'));
        y += subPx * 1.6;
    }
    const layout = slide.layout ?? 'single';
    const chips = copy.chips ?? [];
    const pillPx = width * (cfg.tablet ? 0.017 : 0.025);
    if (chips.length) {
        const [pillElements, bottom] = pills(ids, chips.slice(0, 5), y + height * 0.012, width, pillPx, theme, width * 0.86);
        elements.push(...pillElements);
        y = bottom + height * 0.014;
    } else {
        y += height * 0.02;
    }
    const main = shots[slide.raw ?? slide.id];
    if ((layout === 'duo' || layout === 'sync') && slide.raw2) {
        const devWidth = width * (cfg.tablet ? 0.46 : 0.52);
        elements.push(device(ids, 'Device back', cfg, width * 0.04, y + height * 0.045, devWidth, 6, shots[slide.raw2]));
        elements.push(device(ids, 'Device front', cfg, width * 0.43, y + height * 0.005, devWidth, -5, main));
        if (layout === 'sync') {
            const r = width * 0.085;
            const cx = width * 0.5;
            const cy = y + height * 0.2;
            elements.push(shape(ids, 'Sync badge', 'circle', cx - r, cy - r, 2 * r, 2 * r, '#FFFFFF'));
            elements.push(shape(ids, 'Sync ring', 'circle', cx - r * 0.5, cy - r * 0.5, r, r, 'transparent', 1, { stroke: theme.accent, strokeWidth: Math.round(r * 0.14) }));
            elements.push(shape(ids, 'Sync arrow 1', 'triangle', cx + r * 0.32, cy - r * 0.62, r * 0.32, r * 0.32, theme.accent, 1, { rotation: 40 }));
            elements.push(shape(ids, 'Sync arrow 2', 'triangle', cx - r * 0.64, cy + r * 0.3, r * 0.32, r * 0.32, theme.accent, 1, { rotation: 220 }));
        }
    } else {
        const devWidth = width * (cfg.tablet ? 0.8 : 0.78);
        elements.push(device(ids, 'Device', cfg, (width - devWidth) / 2, y, devWidth, 0, main));
    }
    return {
        id: `${app}-${target}-${slide.id}`,
        name: slide.id,
        position: { x: 15 + index * (width + 60), y: 15 },
        size: { width, height },
        backgroundColor: theme.base,
        backgroundType: 'gradient',
        backgroundGradient: { color1: theme.base, color2: theme.base, angle: 160 },
        zoom: 1,
        elements
    };
}

/** {element id: override} putting the texts of another locale on the artboard (+ its captures when there are some) */
function overlay(artboard, copy, slide, localeShots) {
    const lines = copy.title.split('\n');
    const result = {};
    for (const element of artboard.elements) {
        const name = element.name ?? '';
        let match;
        if ((match = name.match(/^Title (\d+)$/)) && Number(match[1]) <= lines.length) {
            result[element.id] = { content: lines[Number(match[1]) - 1].replace(/\*/g, '') };
        } else if (name === 'Subtitle' && copy.subtitle) {
            result[element.id] = { content: copy.subtitle };
        } else if ((match = name.match(/^Pill text (\d+)$/)) && Number(match[1]) <= (copy.chips ?? []).length) {
            result[element.id] = { content: copy.chips[Number(match[1]) - 1] };
        } else if (element.type === 'device' && localeShots) {
            const raw = name === 'Device back' ? slide.raw2 : (slide.raw ?? slide.id);
            if (localeShots[raw]) result[element.id] = { screenshotSrc: localeShots[raw] };
        }
    }
    return result;
}

/** raw captures of a locale as jpeg data urls (smaller than the png), {name: dataUrl} or undefined when there are none */
async function loadShots(locale, app, target) {
    const dir = rawDir(locale, app, target);
    if (!existsSync(dir)) return undefined;
    const shots = {};
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.png'))) {
        const jpeg = await sharp(join(dir, file)).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
        shots[file.slice(0, -4)] = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    }
    return shots;
}

/** withShots: embed the raw captures (render), else a template with empty device frames */
export async function buildProject(app, target, { withShots = false, font, titleWeight } = {}) {
    const slidesCfg = slidesConfig()[app];
    FONT = font ?? slidesCfg.theme.font ?? DEFAULT_FONT;
    TITLE_WEIGHT = titleWeight ?? slidesCfg.theme.titleWeight ?? '800';
    const copies = locales();
    const cfg = TARGETS[target];
    const baseShots = withShots ? ((await loadShots(BASE_LOCALE, app, target)) ?? {}) : {};
    const artboards = [];
    const slides = [];
    for (const slide of slidesCfg.slides) {
        if (withShots && (!baseShots[slide.raw ?? slide.id] || (slide.raw2 && !baseShots[slide.raw2]))) {
            console.log(`  skip ${slide.id} (no capture)`);
            continue;
        }
        artboards.push(board(app, artboards.length, slide, copies[BASE_LOCALE][app].slides[slide.id], slidesCfg.theme, target, cfg, baseShots));
        slides.push(slide);
    }
    const others = Object.keys(copies).filter((code) => code !== BASE_LOCALE);
    if (others.length) {
        const otherShots = Object.fromEntries(await Promise.all(others.map(async (code) => [code, withShots ? await loadShots(code, app, target) : undefined])));
        artboards.forEach((artboard, index) => {
            artboard.localization = { baseLocale: BASE_LOCALE, locales: [BASE_LOCALE, ...others].map((code) => ({ code })) };
            artboard.localized = Object.fromEntries(others.filter((code) => copies[code][app].slides[slides[index].id]).map((code) => [code, overlay(artboard, copies[code][app].slides[slides[index].id], slides[index], otherShots[code])]));
        });
    }
    return {
        id: `${app}-${target}`,
        name: copies[BASE_LOCALE][app].feature.name,
        description: `Store screenshots of ${app} for ${target}`,
        category: 'screenshots',
        timestamp: '2026-01-01T00:00:00.000Z',
        projectData: artboards
    };
}

/** the 1024x500 Google Play feature graphic: icon, name, tagline and three phones. Same project shape, one artboard. */
export async function buildFeature(app, { withShots = false, font, titleWeight } = {}) {
    const slidesCfg = slidesConfig()[app];
    FONT = font ?? slidesCfg.theme.font ?? DEFAULT_FONT;
    TITLE_WEIGHT = titleWeight ?? slidesCfg.theme.titleWeight ?? '800';
    const theme = slidesCfg.theme;
    const copies = locales();
    const cfg = TARGETS['android-phone'];
    const [width, height] = [1024, 500];
    const ids = makeIds('f');
    const shotsOf = async (locale) => (withShots ? ((await loadShots(locale, app, 'android-phone')) ?? {}) : {});
    const baseShots = await shotsOf(BASE_LOCALE);
    const names = slidesCfg.feature.slides;
    const elements = [];
    [
        [0.98, 0.02, 0.62, 0.8],
        [0.0, 0.9, 0.5, 0.6],
        [0.6, 1.0, 0.6, 0.65]
    ].forEach(([fx, fy, fr, opacity], blob) => {
        const r = fr * width;
        elements.push(shape(ids, 'Aurora', 'circle', fx * width - r, fy * height - r, 2 * r, 2 * r, theme.blobs[blob % theme.blobs.length], opacity, { blur: 120 }));
    });
    const icon = await sharp(join(REPO, slidesCfg.icon)).resize(256, 256).png().toBuffer();
    elements.push({
        id: ids('i'), type: 'image', name: 'Icon', position: { x: 64, y: 72 }, size: { width: 92, height: 92 }, rotation: 0, scale: 1,
        imageSrc: `data:image/png;base64,${icon.toString('base64')}`, objectFit: 'contain', borderRadius: 22,
        shadow: { x: 0, y: 8, blur: 16, color: 'rgba(0,0,0,0.35)' }
    });
    const copy = copies[BASE_LOCALE][app].feature;
    elements.push(text(ids, 'Name', copy.name, 64, 188, 440, 130, 50, theme.title, TITLE_WEIGHT, 'left', 1.05));
    elements.push(text(ids, 'Tagline', copy.tagline, 64, 316, 400, 120, 26, theme.subtitle, '500', 'left', 1.25));
    [
        [640, 120, -8],
        [500, 205, -2],
        [800, 260, 8]
    ].forEach(([x, y, rotation], index) => {
        if (names[index]) elements.push(device(ids, `Device ${index + 1}`, cfg, x, y, 190, rotation, baseShots[names[index]]));
    });
    const artboard = {
        id: `${app}-feature`, name: 'feature', position: { x: 15, y: 15 }, size: { width, height },
        backgroundColor: theme.base, backgroundType: 'gradient', backgroundGradient: { color1: theme.base, color2: theme.base, angle: 160 }, zoom: 1, elements
    };
    const others = Object.keys(copies).filter((code) => code !== BASE_LOCALE);
    if (others.length) {
        artboard.localization = { baseLocale: BASE_LOCALE, locales: [BASE_LOCALE, ...others].map((code) => ({ code })) };
        artboard.localized = {};
        for (const code of others) {
            const localized = copies[code][app].feature;
            const shots = await shotsOf(code);
            artboard.localized[code] = {};
            for (const element of artboard.elements) {
                if (element.name === 'Name') artboard.localized[code][element.id] = { content: localized.name };
                if (element.name === 'Tagline') artboard.localized[code][element.id] = { content: localized.tagline };
                const index = Number(element.name?.match(/^Device (\d)$/)?.[1]) - 1;
                if (element.type === 'device' && shots[names[index]]) artboard.localized[code][element.id] = { screenshotSrc: shots[names[index]] };
            }
        }
    }
    return { id: `${app}-feature`, name: copy.name, description: `Google Play feature graphic of ${app}`, category: 'play-feature-graphic', timestamp: '2026-01-01T00:00:00.000Z', projectData: [artboard] };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    const args = parseArgs(process.argv.slice(2));
    const out = join(STORE, 'templates');
    mkdirSync(out, { recursive: true });
    for (const app of args.app ? [args.app] : Object.keys(slidesConfig())) {
        for (const target of args.target ? [args.target] : Object.keys(TARGETS)) {
            const project = await buildProject(app, target);
            const path = join(out, `${app}-${target}.json`);
            writeFileSync(path, `${JSON.stringify(project, null, 1)}\n`);
            console.log('wrote', path.replace(`${STORE}/`, ''), project.projectData.length, 'boards');
        }
        const feature = await buildFeature(app);
        writeFileSync(join(out, `${app}-feature.json`), `${JSON.stringify(feature, null, 1)}\n`);
        console.log('wrote', `templates/${app}-feature.json`);
    }
}
