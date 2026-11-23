// Builds ONE Open Screenshot Generator project per app (https://github.com/dotnetdreamer/open-screenshot-generator)
// from <store dir>/slides.json + locales/*.json (+ the raw captures made by maestro).
//
//   node tools/store-graphics/build-project.mjs   -> <store dir>/templates/<app>.json (no captures: empty device frames, committed)
//   import { buildApp } from './build-project.mjs' (render.mjs: the same project with the captures embedded)
//
// The artboards are iPhone sized (1206x2622). The other stores come from the same artboards with osg "device sets":
// each device element has the screenshot of the iPad / Android phone / Android tablet in `deviceSets`, and the CLI
// converts the artboard to the store size (render --formats ios-6-9|play-phone|ipad-13|tablet-10), swapping the frame.
// Languages are overlays: artboard.localized[locale][elementId] and deviceSets[format].screens[id].localized[locale].
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { BASE_LOCALE, REPO, STORE, TARGETS, TOOL_DIR, locales, parseArgs, rawDir, readJson, slidesConfig } from './lib.mjs';

const ICONS = readJson(join(TOOL_DIR, 'icons.json'));
const BASE = { width: 1206, height: 2622 };
const FEATURE = { width: 1024, height: 500 };
const TEXT_UNIT = 0.3; // osg draws text at fontSize / 0.3 artboard px
const DEFAULT_FONT = 'Bricolage Grotesque';
const PHONE_FRAME = { type: 'iphone-17-pro-max', aspect: 440 / 956 };
const ANDROID_FRAME = { type: 'pixel-10-pro', aspect: 0.455 };

const fontSize = (px) => Math.round(px * TEXT_UNIT * 100) / 100;
const round = (value) => Math.round(value * 100) / 100;

function makeIds(prefix) {
    let count = 0;
    return (kind) => `${prefix}-${kind}${++count}`;
}

/** an offset (dx, dy) rotated by `degrees` */
function rotate(dx, dy, degrees) {
    const a = (degrees * Math.PI) / 180;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}

class Builder {
    constructor(theme, prefix) {
        this.theme = theme;
        this.font = theme.font ?? DEFAULT_FONT;
        this.weight = theme.titleWeight ?? '800';
        this.id = makeIds(prefix);
        this.elements = [];
    }

    add(element) {
        this.elements.push(element);
        return element;
    }

    text(name, content, x, y, w, h, px, color, { weight = '700', align = 'center', lineHeight = 1.08, rotation = 0, group } = {}) {
        return this.add({
            id: this.id('t'), type: 'text', name, position: { x: round(x), y: round(y) }, size: { width: Math.round(w), height: Math.round(h) }, rotation, scale: 1,
            content, fontSize: fontSize(px), color, fontFamily: this.font, fontWeight: weight, fontStyle: 'normal', textAlign: align, lineHeight, ...(group && { groupId: group.id, groupName: group.name })
        });
    }

    shape(name, kind, x, y, w, h, fill, { opacity = 1, radius, blur, stroke = 'transparent', strokeWidth = 0, rotation = 0, gradient, shadow, svg, viewBox = '0 0 24 24', group } = {}) {
        const element = {
            id: this.id('s'), type: 'shape', name, position: { x: round(x), y: round(y) }, size: { width: Math.round(w), height: Math.round(h) }, rotation, scale: 1,
            shapeType: svg ? 'custom-svg' : kind, fillColor: fill, strokeColor: stroke, strokeWidth, fillOpacity: opacity
        };
        if (svg) {
            element.customPath = svg;
            element.specialProps = { viewBox };
        }
        if (radius !== undefined) element.borderRadius = radius;
        if (blur) element.blur = blur;
        if (gradient) element.fillGradient = gradient;
        if (shadow) element.shadow = shadow;
        if (group) Object.assign(element, { groupId: group.id, groupName: group.name });
        return this.add(element);
    }

    /** an icon of icons.json drawn in a size x size box */
    icon(name, key, x, y, size, color, opts = {}) {
        return this.shape(name, 'custom-svg', x, y, size, size, color ?? ICONS[key].color ?? '#000000', { svg: ICONS[key].path, ...opts });
    }

    device(name, frame, x, y, w, rotation, shot, group) {
        const element = {
            id: this.id('d'), type: 'device', name, position: { x: round(x), y: round(y) }, size: { width: Math.round(w), height: round(w / frame.aspect) }, rotation, scale: 1,
            deviceType: frame.type, styleType: 'normal', frameColor: '#17171C', screenshotObjectFit: 'cover', screenshotRect: { left: 0, top: 0, width: 100, height: 100 },
            shadow: { x: 0, y: Math.round(w * 0.035), blur: Math.round(w * 0.09), color: 'rgba(0,0,0,0.42)' }, ...(group && { groupId: group.id, groupName: group.name })
        };
        if (shot) Object.assign(element, { screenshotSrc: shot.src, naturalScreenshotWidth: shot.w, naturalScreenshotHeight: shot.h });
        return this.add(element);
    }

    /** soft light and shade on the gradient: a glow in a corner, a darker bottom */
    backdrop(width, height, index, gradient) {
        const corners = [
            [0.95, 0.04],
            [0.05, 0.3],
            [0.9, 0.55],
            [0.1, 0.08]
        ];
        const [fx, fy] = corners[index % corners.length];
        const r = width * 0.75;
        this.shape('Glow', 'circle', fx * width - r, fy * height - r, 2 * r, 2 * r, '#FFFFFF', { opacity: 0.2, blur: Math.round(width * 0.2) });
        const r2 = width * 0.55;
        this.shape('Glow 2', 'circle', (1 - fx) * width - r2, (fy < 0.2 ? 0.8 : 0.9) * height - r2, 2 * r2, 2 * r2, gradient[0], { opacity: 0.5, blur: Math.round(width * 0.16) });
        this.shape('Bottom shade', 'rectangle', 0, height * 0.62, width, height * 0.38, '#000000', { gradient: { color1: 'rgba(0,0,0,0)', color2: 'rgba(0,0,0,0.3)', angle: 180 } });
    }
}

/** white sticker pills with a colored icon, slightly tilted. Returns the bottom y. */
function pills(b, labels, icons, y, width, px, color, maxWidth = width * 0.88) {
    const gap = px * 0.8;
    const height = px * 2.3;
    const iconBox = px * 1.5;
    const widths = labels.map((label) => label.length * px * 0.6 + px * 1.5 + iconBox + px * 0.8);
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
        // the whole row is one group: the device set layouts move a group as one piece instead of spreading its members
        const group = { id: b.id('g'), name: `Chips ${rowIndex + 1}` };
        for (const i of row) {
            const w = widths[i];
            const tilt = [-2.2, 1.6, -1.2, 2][i % 4];
            const cx = x + w / 2;
            const cy = top + height / 2;
            b.shape(`Pill ${i + 1}`, 'rectangle', x, top, w, height, '#FFFFFF', { radius: height / 2, rotation: tilt, group, shadow: { x: 0, y: 10, blur: 24, color: 'rgba(0,0,0,0.28)' } });
            // the icon sits on the left, the text in the rest: both placed around the (rotated) center
            const [ix, iy] = rotate(-w / 2 + px * 0.75 + iconBox / 2, 0, tilt);
            b.shape(`Chip dot ${i + 1}`, 'circle', cx + ix - iconBox / 2, cy + iy - iconBox / 2, iconBox, iconBox, color, { group });
            b.icon(`Chip icon ${i + 1}`, icons[i] ?? 'check', cx + ix - iconBox * 0.32, cy + iy - iconBox * 0.32, iconBox * 0.64, '#FFFFFF', { rotation: tilt, group });
            const textW = w - (px * 0.75 + iconBox + px * 0.5) - px * 0.6;
            const [tx, ty] = rotate((px * 0.75 + iconBox + px * 0.5 - px * 0.6) / 2, 0, tilt);
            b.text(`Pill text ${i + 1}`, labels[i], cx + tx - textW / 2, cy + ty - px * 0.66, textW, px * 1.4, px, '#1B1B2F', { weight: '700', rotation: tilt, lineHeight: 1, group });
            x += w + gap;
        }
    });
    return y + rows.length * (height + gap) - gap;
}

/** sync services as white tiles with the logo of each. Returns the bottom y. */
function tiles(b, labels, iconKeys, y, width, color) {
    const count = labels.length;
    const gap = width * 0.026;
    const size = Math.min(width * 0.158, (width * 0.9 - gap * (count - 1)) / count);
    let x = (width - (size * count + gap * (count - 1))) / 2;
    const group = { id: b.id('g'), name: 'Services' };
    labels.forEach((label, i) => {
        b.shape(`Tile ${i + 1}`, 'rectangle', x, y, size, size * 1.12, '#FFFFFF', { radius: size * 0.24, group, shadow: { x: 0, y: 12, blur: 28, color: 'rgba(0,0,0,0.3)' } });
        const key = iconKeys[i] ?? 'server';
        b.icon(`Logo ${i + 1}`, key, x + size * 0.22, y + size * 0.16, size * 0.56, ICONS[key]?.color ?? color, { group });
        b.text(`Tile text ${i + 1}`, label, x - size * 0.1, y + size * 0.78, size * 1.2, size * 0.3, size * 0.115, '#1B1B2F', { weight: '700', lineHeight: 1, group });
        x += size + gap;
    });
    return y + size * 1.12;
}

function board(app, index, slide, copy, theme, shots, formatShots) {
    const { width, height } = BASE;
    const b = new Builder(theme, `b${index}`);
    const gradient = slide.bg ?? theme.bg ?? ['#4F46E5', '#7C3AED'];
    b.backdrop(width, height, index, gradient);
    // title: a line holding a *marked* word is drawn in the accent color
    const lines = copy.title.split('\n');
    const longest = Math.max(...lines.map((line) => line.replace(/\*/g, '').length));
    const titlePx = Math.min(width * 0.1, (width * 0.88) / (longest * 0.56));
    let y = height * 0.056;
    const titleGroup = { id: b.id('g'), name: 'Headline' };
    lines.forEach((line, lineIndex) => {
        b.text(`Title ${lineIndex + 1}`, line.replace(/\*/g, ''), width * 0.05, y, width * 0.9, titlePx * 1.25, titlePx, line.includes('*') ? theme.accent : '#FFFFFF', { weight: b.weight, group: titleGroup });
        y += titlePx * 1.12;
    });
    const subPx = width * 0.04;
    if (copy.subtitle) {
        y += titlePx * 0.1;
        b.text('Subtitle', copy.subtitle, width * 0.05, y, width * 0.9, subPx * 1.4, subPx, 'rgba(255,255,255,0.9)', { weight: '500', group: titleGroup });
        y += subPx * 1.7;
    }
    const layout = slide.layout ?? 'single';
    const chips = copy.chips ?? [];
    const pillPx = width * 0.027;
    if (layout === 'sync' && chips.length) {
        y = tiles(b, chips.slice(0, 5), slide.icons ?? [], y + height * 0.014, width, gradient[1]) + height * 0.02;
    } else if (chips.length) {
        y = pills(b, chips.slice(0, 5), slide.icons ?? [], y + height * 0.016, width, pillPx, gradient[1]) + height * 0.02;
    } else {
        y += height * 0.02;
    }
    const names = layout === 'single' ? ['Device'] : ['Device back', 'Device front'];
    const rawNames = layout === 'single' ? [slide.raw ?? slide.id] : [slide.raw2, slide.raw ?? slide.id];
    if (layout === 'single') {
        const devWidth = width * 0.78;
        b.device('Device', PHONE_FRAME, (width - devWidth) / 2, y, devWidth, 0, shots[rawNames[0]]);
    } else {
        const devWidth = width * 0.52;
        const y0 = y + height * 0.03;
        b.device('Device back', PHONE_FRAME, width * 0.04, y0 + height * 0.04, devWidth, 6, shots[rawNames[0]]);
        b.device('Device front', PHONE_FRAME, width * 0.43, y0, devWidth, -5, shots[rawNames[1]]);
        if (layout === 'sync') {
            const r = width * 0.085;
            const cx = width * 0.5;
            const cy = y0 + height * 0.25;
            const group = { id: b.id('g'), name: 'Sync badge' };
            b.shape('Sync ring', 'circle', cx - r * 1.28, cy - r * 1.28, r * 2.56, r * 2.56, '#FFFFFF', { opacity: 0.28, group });
            b.shape('Sync badge', 'circle', cx - r, cy - r, 2 * r, 2 * r, '#FFFFFF', { group, shadow: { x: 0, y: 14, blur: 30, color: 'rgba(0,0,0,0.35)' } });
            b.icon('Sync icon', 'sync', cx - r * 0.62, cy - r * 0.62, r * 1.24, gradient[1], { group });
        }
    }
    const devices = b.elements.filter((element) => element.type === 'device');
    const artboard = {
        id: `${app}-${slide.id}`, name: slide.id, position: { x: 15 + index * (width + 60), y: 15 }, size: { width, height },
        backgroundColor: gradient[1], backgroundType: 'gradient', backgroundGradient: { color1: gradient[0], color2: gradient[1], angle: slide.angle ?? 165 }, zoom: 1,
        elements: b.elements
    };
    // the screenshots of the other stores: one per device element and per format (see the header)
    const deviceSets = {};
    for (const [format, target] of formatShots) {
        const screens = {};
        devices.forEach((device, i) => {
            const set = target.shots[rawNames[i]];
            if (set) screens[device.id] = { screenshotSrc: set.src, naturalScreenshotWidth: set.w, naturalScreenshotHeight: set.h, ...(target.localized(rawNames[i]) && { localized: target.localized(rawNames[i]) }) };
        });
        if (Object.keys(screens).length === devices.length) deviceSets[format] = { screens };
    }
    if (Object.keys(deviceSets).length) artboard.deviceSets = deviceSets;
    return { artboard, devices, rawNames };
}

/** every raw capture of a target in a locale as jpeg data urls: {name: {src, w, h}} (undefined when the folder does not exist) */
async function loadShots(locale, app, target) {
    const dir = rawDir(locale, app, target);
    if (!existsSync(dir)) return undefined;
    const shots = {};
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.png'))) {
        const image = sharp(join(dir, file));
        const { width, height } = await image.metadata();
        const jpeg = await image.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
        shots[file.slice(0, -4)] = { src: `data:image/jpeg;base64,${jpeg.toString('base64')}`, w: width, h: height };
    }
    return shots;
}

/** the 1024x500 Google Play feature graphic: icon, name, tagline and three phones (same project, one more artboard) */
async function featureBoard(app, appCfg, copies, shots, index) {
    const { width, height } = FEATURE;
    const theme = appCfg.theme;
    const gradient = appCfg.feature.bg ?? appCfg.slides[0].bg ?? ['#4F46E5', '#7C3AED'];
    const b = new Builder(theme, 'f');
    const r = width * 0.62;
    b.shape('Glow', 'circle', width * 0.95 - r, -r * 0.45, 2 * r, 2 * r, '#FFFFFF', { opacity: 0.2, blur: 90 });
    b.shape('Glow 2', 'circle', -r * 0.4, height - r * 0.5, 1.4 * r, 1.4 * r, gradient[0], { opacity: 0.5, blur: 80 });
    const icon = await sharp(join(REPO, appCfg.icon)).resize(256, 256).png().toBuffer();
    b.add({
        id: b.id('i'), type: 'image', name: 'Icon', position: { x: 64, y: 70 }, size: { width: 92, height: 92 }, rotation: 0, scale: 1,
        imageSrc: `data:image/png;base64,${icon.toString('base64')}`, objectFit: 'contain', borderRadius: 22, shadow: { x: 0, y: 8, blur: 16, color: 'rgba(0,0,0,0.35)' }
    });
    const copy = copies[BASE_LOCALE][app].feature;
    b.text('Name', copy.name, 64, 188, 440, 130, 50, '#FFFFFF', { weight: b.weight, align: 'left', lineHeight: 1.05 });
    b.text('Tagline', copy.tagline, 64, 316, 400, 120, 26, 'rgba(255,255,255,0.92)', { weight: '500', align: 'left', lineHeight: 1.25 });
    const names = appCfg.feature.slides;
    [
        [640, 120, -8],
        [500, 205, -2],
        [800, 260, 8]
    ].forEach(([x, y, rotation], i) => {
        if (names[i]) b.device(`Device ${i + 1}`, ANDROID_FRAME, x, y, 190, rotation, shots[names[i]]);
    });
    const artboard = {
        id: `${app}-feature`, name: 'feature', position: { x: 15 + index * (BASE.width + 60), y: 15 }, size: { width, height },
        backgroundColor: gradient[1], backgroundType: 'gradient', backgroundGradient: { color1: gradient[0], color2: gradient[1], angle: 115 }, zoom: 1, elements: b.elements
    };
    return { artboard, devices: b.elements.filter((element) => element.type === 'device'), names };
}

/**
 * The project of an app: one artboard per slide + the feature graphic.
 * Returns { project, formats: { <target>: [artboard ids to render for it] } }
 */
export async function buildApp(app, { withShots = false, font, titleWeight } = {}) {
    const appCfg = slidesConfig()[app];
    if (font || titleWeight) appCfg.theme = { ...appCfg.theme, ...(font && { font }), ...(titleWeight && { titleWeight }) };
    const copies = locales();
    const others = Object.keys(copies).filter((code) => code !== BASE_LOCALE);
    const loaded = {};
    for (const locale of Object.keys(copies)) {
        loaded[locale] = {};
        for (const target of Object.keys(TARGETS)) loaded[locale][target] = withShots ? ((await loadShots(locale, app, target)) ?? {}) : {};
    }
    const baseShots = loaded[BASE_LOCALE]['ios-phone'];
    // [format, { shots (base locale), localized(rawName) -> {locale: shot} }] for the stores that are not the iPhone
    const formatShots = Object.entries(TARGETS)
        .filter(([, cfg]) => cfg.deviceSet)
        .map(([target, cfg]) => [cfg.deviceSet, { target, shots: loaded[BASE_LOCALE][target], localized: (raw) => Object.fromEntries(others.filter((code) => loaded[code][target][raw]).map((code) => [code, { screenshotSrc: loaded[code][target][raw].src, naturalScreenshotWidth: loaded[code][target][raw].w, naturalScreenshotHeight: loaded[code][target][raw].h }])) }]);
    const boards = [];
    const formats = Object.fromEntries(Object.keys(TARGETS).map((target) => [target, []]));
    for (const slide of appCfg.slides) {
        const needed = (slide.layout ?? 'single') === 'single' ? [slide.raw ?? slide.id] : [slide.raw ?? slide.id, slide.raw2];
        if (withShots && !needed.every((raw) => baseShots[raw])) {
            console.log(`  skip ${slide.id} (no iPhone capture)`);
            continue;
        }
        const built = board(app, boards.length, slide, copies[BASE_LOCALE][app].slides[slide.id], appCfg.theme, baseShots, formatShots);
        const { artboard, devices, rawNames } = built;
        // other languages: the texts and the iPhone screenshots
        if (others.length) {
            artboard.localization = { baseLocale: BASE_LOCALE, locales: [BASE_LOCALE, ...others].map((code) => ({ code })) };
            artboard.localized = {};
            for (const code of others) {
                const copy = copies[code]?.[app]?.slides?.[slide.id];
                if (!copy) continue;
                artboard.localized[code] = overlayTexts(artboard, copy);
                devices.forEach((device, i) => {
                    const shot = loaded[code]['ios-phone'][rawNames[i]];
                    if (shot) artboard.localized[code][device.id] = { screenshotSrc: shot.src, naturalScreenshotWidth: shot.w, naturalScreenshotHeight: shot.h };
                });
            }
        }
        if (artboard.deviceSets) artboard.deviceSetFormats = Object.keys(artboard.deviceSets);
        boards.push(artboard);
        formats['ios-phone'].push(artboard.id);
        for (const [target, cfg] of Object.entries(TARGETS)) if (cfg.deviceSet && artboard.deviceSets?.[cfg.deviceSet]) formats[target].push(artboard.id);
        if (!withShots) for (const target of Object.keys(TARGETS)) if (!formats[target].includes(artboard.id)) formats[target].push(artboard.id);
    }
    const feature = await featureBoard(app, appCfg, copies, loaded[BASE_LOCALE]['android-phone'], boards.length);
    if (others.length) {
        feature.artboard.localization = { baseLocale: BASE_LOCALE, locales: [BASE_LOCALE, ...others].map((code) => ({ code })) };
        feature.artboard.localized = {};
        for (const code of others) {
            const localized = copies[code]?.[app]?.feature;
            if (!localized) continue;
            const overrides = {};
            for (const element of feature.artboard.elements) {
                if (element.name === 'Name') overrides[element.id] = { content: localized.name };
                if (element.name === 'Tagline') overrides[element.id] = { content: localized.tagline };
            }
            feature.devices.forEach((device, i) => {
                const shot = loaded[code]['android-phone'][feature.names[i]];
                if (shot) overrides[device.id] = { screenshotSrc: shot.src, naturalScreenshotWidth: shot.w, naturalScreenshotHeight: shot.h };
            });
            feature.artboard.localized[code] = overrides;
        }
    }
    boards.push(feature.artboard);
    const project = {
        formatVersion: 1, id: app, name: copies[BASE_LOCALE][app].feature.name, description: `Store screenshots and feature graphic of ${app}`, category: 'screenshots',
        timestamp: '2026-01-01T00:00:00.000Z', projectData: boards, media: []
    };
    return { project, formats, feature: feature.artboard.id };
}

/** {element id: override}: the texts of another locale on the artboard */
function overlayTexts(artboard, copy) {
    const lines = copy.title.split('\n');
    const result = {};
    for (const element of artboard.elements) {
        const name = element.name ?? '';
        let match;
        if ((match = name.match(/^Title (\d+)$/)) && Number(match[1]) <= lines.length) result[element.id] = { content: lines[Number(match[1]) - 1].replace(/\*/g, '') };
        else if (name === 'Subtitle' && copy.subtitle) result[element.id] = { content: copy.subtitle };
        else if ((match = name.match(/^Pill text (\d+)$/)) && Number(match[1]) <= (copy.chips ?? []).length) result[element.id] = { content: copy.chips[Number(match[1]) - 1] };
        else if ((match = name.match(/^Tile text (\d+)$/)) && Number(match[1]) <= (copy.chips ?? []).length) result[element.id] = { content: copy.chips[Number(match[1]) - 1] };
    }
    return result;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    const args = parseArgs(process.argv.slice(2));
    const out = join(STORE, 'templates');
    mkdirSync(out, { recursive: true });
    for (const app of args.app ? [args.app] : Object.keys(slidesConfig())) {
        const { project } = await buildApp(app);
        const path = join(out, `${app}.json`);
        writeFileSync(path, `${JSON.stringify(project, null, 1)}\n`);
        console.log('wrote', path.replace(`${STORE}/`, ''), project.projectData.length, 'artboards');
    }
}
