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

/**
 * The store slots. `format` = the osg conversion id (render --formats), `deviceSet` = the osg device set of the screenshots
 * of that device (null for the iPhone: it is the artboard itself), `size` = what osg renders, `raw` = captures folder.
 */
export const TARGETS = {
    'ios-phone': { format: 'ios-6-9', deviceSet: null, size: [1290, 2796], folder: 'ios/screenshots/{locale}', name: '{nn}_APP_IPHONE_69_{id}.jpg' },
    'ios-tablet': { format: 'ipad-13', deviceSet: 'ipad-pro-13', size: [2064, 2752], folder: 'ios/screenshots/{locale}', name: '{nn}_APP_IPAD_PRO_3GEN_129_{id}.jpg' },
    'android-phone': { format: 'play-phone', deviceSet: 'android', size: [1080, 1920], folder: 'android/{locale}/images/phoneScreenshots', name: '{n}_{locale}.jpg' },
    'android-tablet': { format: 'tablet-10', deviceSet: 'tablet-10', size: [1440, 2560], folder: 'android/{locale}/images/tenInchScreenshots', name: '{n}_{locale}.jpg' }
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
