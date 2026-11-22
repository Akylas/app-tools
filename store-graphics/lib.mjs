import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** where the shared scripts and their node_modules live (tools/store-graphics) */
export const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
/** the app repo: run the scripts from its root */
export const REPO = process.cwd();
/** the app's store folder (slides.json, locales/, maestro/, templates/, raw/): --dir, else graphics/store */
export const STORE = resolve(REPO, process.argv.includes('--dir') ? process.argv[process.argv.indexOf('--dir') + 1] : 'graphics/store');
export const BASE_LOCALE = 'en-US';
export const bin = (name) => join(TOOL_DIR, 'node_modules', '.bin', name);

/** store slots and the osg device frame of each target. aspect = width / height of the frame. */
export const TARGETS = {
    'ios-phone': { size: [1320, 2868], device: 'iphone-17-pro-max', aspect: 440 / 956, tablet: false, folder: 'ios/screenshots/{locale}', name: '{nn}_APP_IPHONE_69_{id}.jpg' },
    'ios-tablet': { size: [2064, 2752], device: 'ipad-pro-13', aspect: 2064 / 2752, tablet: true, folder: 'ios/screenshots/{locale}', name: '{nn}_APP_IPAD_PRO_3GEN_129_{id}.jpg' },
    'android-phone': { size: [1440, 2560], device: 'pixel-10-pro', aspect: 0.455, tablet: false, folder: 'android/{locale}/images/phoneScreenshots', name: '{n}_{locale}.jpg' },
    'android-tablet': { size: [1600, 2560], device: 'tablet-10', aspect: 0.625, tablet: true, folder: 'android/{locale}/images/tenInchScreenshots', name: '{n}_{locale}.jpg' }
};

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const config = () => readJson(join(STORE, 'slides.json'));
export const slidesConfig = () => config().apps;
/** fastlane metadata folder of an app: <config.fastlane>/<app.id> */
export const fastlaneDir = (app) => join(REPO, config().fastlane ?? 'fastlane/metadata', slidesConfig()[app].id);
export const locales = () =>
    Object.fromEntries(
        readdirSync(join(STORE, 'locales'))
            .filter((file) => file.endsWith('.json'))
            .map((file) => [file.slice(0, -5), readJson(join(STORE, 'locales', file)).apps])
    );
export const rawDir = (locale, app, target) => join(STORE, 'raw', locale, app, target);

/** `--key value` / `--flag` arguments */
export function parseArgs(argv) {
    const args = { _: [] };
    for (let index = 0; index < argv.length; index++) {
        if (argv[index].startsWith('--')) {
            const next = argv[index + 1];
            if (next === undefined || next.startsWith('--')) {
                args[argv[index].slice(2)] = true;
            } else {
                args[argv[index].slice(2)] = next;
                index++;
            }
        } else {
            args._.push(argv[index]);
        }
    }
    return args;
}
