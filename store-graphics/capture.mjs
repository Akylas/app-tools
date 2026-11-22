// Takes the raw store screens of both apps with maestro (flows in maestro/), on simulators / emulators seeded with
// the demo data of test_assets/demo (deploy_android.sh / deploy_sim.sh).
//
//   node tools/store-graphics/capture.mjs ios --phone <sim udid> --tablet <sim udid> [--locales en-US,fr-FR] [--app cardwallet]
//   node tools/store-graphics/capture.mjs android --phone <adb serial> --tablet <adb serial>
//
// Output: raw/<locale>/<app>/<platform>-<phone|tablet>/<screen>.png (git-ignored). A device flag can be left out.
// The apps must be installed. The language of the device (apps follow it) and the dark mode are switched here.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STORE, locales, parseArgs, rawDir, slidesConfig } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const platform = args._[0];
if (!['ios', 'android'].includes(platform)) {
    console.error('usage: capture.mjs <ios|android> --phone <id> --tablet <id> [--locales en-US,fr-FR] [--app name]');
    process.exit(1);
}
const wantedLocales = (args.locales ?? Object.keys(locales()).join(',')).split(',');
const apps = slidesConfig();
const BUNDLES = Object.fromEntries(Object.entries(apps).map(([name, app]) => [name, app.id]));
/** per app (slides.json `capture`): flows[target] ?? flows['*'], dark (the flow run in dark mode), points[target] (taps by percent of the screen, passed to the flows as env) */
const flowsOf = (app, target) => apps[app].capture.flows[target] ?? apps[app].capture.flows['*'];

const sh = (command, commandArgs, options = {}) => spawnSync(command, commandArgs, { encoding: 'utf8', ...options });
const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// ----------------------------------------------------------------------------- device control

const device = {
    async prepare(id, target, locale) {
        if (platform === 'ios') {
            const language = locale.split('-')[0];
            const current = sh('xcrun', ['simctl', 'spawn', id, 'defaults', 'read', 'NSGlobalDomain', 'AppleLocale']).stdout.trim();
            if (current !== locale.replace('-', '_')) {
                sh('xcrun', ['simctl', 'spawn', id, 'defaults', 'write', 'NSGlobalDomain', 'AppleLanguages', '-array', language]);
                sh('xcrun', ['simctl', 'spawn', id, 'defaults', 'write', 'NSGlobalDomain', 'AppleLocale', '-string', locale.replace('-', '_')]);
                sh('xcrun', ['simctl', 'shutdown', id]);
                sh('xcrun', ['simctl', 'boot', id]);
                sh('xcrun', ['simctl', 'bootstatus', id]);
            }
            sh('xcrun', ['simctl', 'status_bar', id, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3', '--operatorName', '']);
            sh('xcrun', ['simctl', 'ui', id, 'appearance', 'light']);
        } else {
            const adb = (...a) => sh('adb', ['-s', id, ...a]);
            adb('shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1');
            const demo = (...a) => adb('shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', ...a);
            demo('-e', 'command', 'enter');
            demo('-e', 'command', 'clock', '-e', 'hhmm', '0941');
            demo('-e', 'command', 'battery', '-e', 'level', '100', '-e', 'plugged', 'false');
            demo('-e', 'command', 'network', '-e', 'wifi', 'show', '-e', 'level', '4', '-e', 'mobile', 'hide');
            demo('-e', 'command', 'notifications', '-e', 'visible', 'false');
            if (target === 'android-tablet') {
                // a tablet is landscape by nature, the gboard stylus dialog eats the typed text
                adb('shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0');
                adb('shell', 'settings', 'put', 'system', 'user_rotation', '1');
                adb('shell', 'settings', 'put', 'secure', 'stylus_handwriting_enabled', '0');
            }
            for (const bundle of Object.values(BUNDLES)) adb('shell', 'cmd', 'locale', 'set-app-locales', bundle, '--locales', locale);
            adb('shell', 'cmd', 'uimode', 'night', 'no');
            await sleep(3);
        }
    },
    dark(id, on) {
        if (platform === 'ios') sh('xcrun', ['simctl', 'ui', id, 'appearance', on ? 'dark' : 'light']);
        else sh('adb', ['-s', id, 'shell', 'cmd', 'uimode', 'night', on ? 'yes' : 'no']);
    }
};

// ----------------------------------------------------------------------------- maestro

/** runs a flow, returns when its last step (takeScreenshot: _end) is done: the maestro cli keeps running after that */
function runFlow(id, flow, env, outDir) {
    return new Promise((resolve) => {
        const work = mkdtempSync(join(tmpdir(), 'maestro-'));
        const flags = Object.entries(env).flatMap(([key, value]) => ['-e', `${key}=${value}`]);
        const child = spawn('maestro', ['--device', id, 'test', '--no-ansi', '--test-output-dir', work, ...flags, join(STORE, 'maestro', flow)], { stdio: ['ignore', 'pipe', 'pipe'] });
        const onLine = (line) => {
            if (/FAILED/.test(line)) console.log('   ', line.trim());
            if (/Take screenshot _end.*COMPLETED/.test(line) || /FAILED/.test(line)) {
                setTimeout(() => child.kill('SIGTERM'), 1500);
            }
        };
        for (const stream of [child.stdout, child.stderr]) {
            let pending = '';
            stream.on('data', (chunk) => {
                const lines = (pending + chunk.toString()).split('\n');
                pending = lines.pop();
                lines.forEach(onLine);
            });
        }
        const timer = setTimeout(() => child.kill('SIGKILL'), 12 * 60 * 1000);
        child.on('close', () => {
            clearTimeout(timer);
            mkdirSync(outDir, { recursive: true });
            const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]));
            const files = walk(work).filter((path) => path.endsWith('.png'));
            const ok = files.some((path) => /_end\.png$/.test(path));
            for (const file of files.filter((path) => !/_end\.png$|step-\d+/.test(path))) copyFileSync(file, join(outDir, file.split('/').at(-1)));
            rmSync(work, { recursive: true, force: true });
            resolve(ok);
        });
    });
}

for (const target of ['phone', 'tablet']) {
    const id = args[target];
    if (!id) continue;
    const full = `${platform}-${target}`;
    for (const locale of wantedLocales) {
        await device.prepare(id, full, locale);
        for (const app of args.app ? [args.app] : Object.keys(BUNDLES)) {
            const out = rawDir(locale, app, full);
            console.log(`${app} ${full} ${locale}`);
            for (const flow of flowsOf(app, full)) {
                const ok = await runFlow(id, flow, { ...(apps[app].capture.points?.[full] ?? {}) }, out);
                if (!ok) console.log(`  ! ${flow} did not finish`);
            }
            device.dark(id, true);
            await sleep(2);
            const dark = apps[app].capture.dark;
            if (!(await runFlow(id, dark, {}, out))) console.log(`  ! ${dark} did not finish`);
            device.dark(id, false);
            await sleep(2);
        }
    }
}
if (!existsSync(join(STORE, 'raw'))) console.log('nothing captured: pass --phone and / or --tablet');
