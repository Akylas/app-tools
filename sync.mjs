import { createHash } from 'crypto';
import { copyFileSync, existsSync, lstatSync, mkdir, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import pkg from '@dotenvx/dotenvx';
const { config, set: dotEnvSet } = pkg;
import { exec, execSync } from 'child_process';

const pluginPackageJSON = JSON.parse(readFileSync('./package.json'));

function checkAndUpdate(json, field) {
    if (typeof json === 'object' && !Array.isArray(json)) {
        if (pluginPackageJSON[field] === undefined) {
            pluginPackageJSON[field] = {};
        }
        for (const [key, value] of Object.entries(json)) {
            if (typeof pluginPackageJSON[field][key] === 'undefined') {
                pluginPackageJSON[field][key] = value;
            } else if (JSON.stringify(value) !== JSON.stringify(pluginPackageJSON[field][key])) {
                if (typeof value === 'object') {
                    pluginPackageJSON[field] = {};
                    pluginPackageJSON[field][key] = value;
                } else {
                    pluginPackageJSON[field][key] = value;
                }
            }
        }
    } else {
        pluginPackageJSON[field] = json;
    }
}

function deleteProperty(obj, match) {
    delete obj[match];
    for (const v of Object.values(obj)) {
        if (v instanceof Object) {
            deleteProperty(v, match);
        }
    }
}

function compareFile(file1, file2) {
    const file1Content = readFileSync(file1);
    const file2Content = readFileSync(file2);

    const hash1 = createHash('md5').update(file1Content).digest('hex');
    const hash2 = createHash('md5').update(file2Content).digest('hex');

    return hash1 === hash2;
}

function handleCommonFile(file, directory) {
    const destFile = `./${directory.replace('_template', '')}${file}`;
    const inFile = `./tools/common/${directory}${file}`;
    if (lstatSync(inFile).isDirectory()) {
        if (!existsSync(destFile)) {
            mkdirSync(destFile);
        }
        readdirSync(inFile).forEach((file2) => handleCommonFile(file2, directory + file + '/'));
    } else {
        if (!existsSync(destFile)) {
            console.log(`Copying common file over: ${inFile}}`);
            copyFileSync(inFile, destFile);
        } else if (!compareFile(destFile, inFile)) {
            console.log(`File: ${inFile} is different from common version.`);
            copyFileSync(inFile, destFile);
        }
    }
}

function removeOldFiles(files) {
    for (let i = 0; i < files.length; i++) {
        if (existsSync(files[i])) {
            unlinkSync(files[i]);
        }
    }
}


function updateDotEnv() {
    const processEnv = {};
    config({ processEnv });
    const processEnvTemplate = {};
    config({ path: './tools/.env.template', processEnv: processEnvTemplate });
    Object.keys(processEnvTemplate).forEach((k) => {
        if (!processEnv[k]) {
            console.log('adding missing env data', k, processEnvTemplate[k]);
            execSync(`./node_modules/.bin/dotenvx set ${k} --plain -- '${processEnvTemplate[k]}'`);
        }
    });
}

readdirSync('./tools/common').forEach((file) => handleCommonFile(file, ''));
removeOldFiles(['./.prettierrc']);

const commonPackageJSON = JSON.parse(readFileSync('./tools/package.json.template'));
checkAndUpdate(commonPackageJSON['scripts'], 'scripts');
checkAndUpdate(commonPackageJSON['packageManager'], 'packageManager');

writeFileSync('./package.json', JSON.stringify(pluginPackageJSON, 0, 4) + '\n');

// updateDotEnv();

console.log('Common files and package.json have been synced.');
