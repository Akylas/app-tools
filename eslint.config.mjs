import eslintConfigPrettier from 'eslint-config-prettier';
import json from 'eslint-plugin-json';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import { globalIgnores } from 'eslint/config';
// import stylistic from '@stylistic/eslint-plugin';
import sort from 'eslint-plugin-sort';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';
const ignoreWarnings = ['a11y-no-onchange', 'a11y-label-hhas-associated-control', 'illegal-attribute-character'];
export default [
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    eslintConfigPrettier,
    sort.configs['flat/recommended'],
    // stylistic.configs['recommended-flat'],
    ...eslintPluginSvelte.configs['flat/recommended'],
    globalIgnores([
        '.nx/',
        '.yarn/',
        '**/dist/**',
        '**/fixtures/**',
        '**/coverage/**',
        '**/__snapshots__/**',
        '**/.docusaurus/**',
        '**/build/**',
        '.nx/*',
        '.yarn/*',
        'yarn.lock',
        'package-lock.json',
        'pnpm-lock.yaml',
        '**/docs',
        '**/hooks',
        '**/vendor',
        '**/app/assets',
        '**/App_Resources',
        '**/node_modules',
        '**/platforms',
        '**/typings/objc!*',
        '**/.vscode'
    ]),
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                parser: tseslint.parser,
                tsconfigRootDir: import.meta.dirname,
                extraFileExtensions: ['.svelte', '.json'],
                project: 'tsconfig.eslint.json'
            },
            globals: {
                SENTRY_DSN: 'readonly',
                SENTRY_PREFIX: 'readonly',
                OWM_KEY: 'readonly',
                __ANDROID__: 'readonly',
                __IOS__: 'readonly',
                DEV_LOG: 'readonly',
                ...globals.node
            }
        },
        rules: {
            '@typescript-eslint/no-unsafe-declaration-merging': 'off',
            'prettier/prettier': [
                'warn',
                {
                    // parser: 'typescript'
                }
            ],
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            '@typescript-eslint/no-base-to-string': 'off',
            '@typescript-eslint/unbound-method': 'off',
            'no-duplicate-imports': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/adjacent-overload-signatures': 'off',
            '@typescript-eslint/array-type': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/class-name-casing': 'off',
            '@typescript-eslint/consistent-type-assertions': 'error',
            '@typescript-eslint/consistent-type-definitions': 'error',
            '@typescript-eslint/explicit-member-accessibility': [
                'off',
                {
                    accessibility: 'explicit'
                }
            ],
            '@typescript-eslint/no-misused-promises': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/indent': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/interface-name-prefix': 'off',
            '@typescript-eslint/member-ordering': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-misused-new': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-parameter-properties': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unnecessary-qualifier': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/no-use-before-declare': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/prefer-for-of': 'off',
            '@typescript-eslint/prefer-function-type': 'error',
            '@typescript-eslint/prefer-namespace-keyword': 'error',
            '@typescript-eslint/space-within-parens': ['off', 'never'],
            '@typescript-eslint/triple-slash-reference': 'off',
            '@typescript-eslint/unified-signatures': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off', // '@stylistic/type-annotation-spacing': 'error',
            '@typescript-eslint/prefer-promise-reject-errors': 'off',
            '@typescript-eslint/prefer-destructuring': 'off',
            // '@stylistic/semi': ['error'],
            // '@stylistic/member-delimiter-style': 'error',
            // '@stylistic/quotes': [
            //     'error',
            //     'single',
            //     {
            //         avoidEscape: true
            //     }
            // ],
            'arrow-body-style': 'error',
            'arrow-parens': ['off', 'as-needed'],
            camelcase: 'off',
            'capitalized-comments': 'off',
            complexity: 'off',
            'constructor-super': 'error',
            curly: ['error', 'multi-line'],
            'dot-notation': 'off',
            'eol-last': 'error',
            eqeqeq: ['error', 'smart'],
            'guard-for-in': 'off',
            'id-blacklist': 'off',
            'id-match': 'error',
            'sort-imports': [
                'error',
                {
                    ignoreCase: false,
                    ignoreDeclarationSort: true,
                    ignoreMemberSort: false,
                    memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
                }
            ],
            'sort/destructuring-properties': ['warn', { caseSensitive: false, natural: true }],
            'sort/exports': 'off',
            'sort/export-members': 'off',
            'sort/imports': 'off',
            'sort/import-members': 'off',
            'sort/object-properties': 'off',
            'linebreak-style': 'off',
            'max-classes-per-file': 'off',
            'max-len': [
                'off',
                {
                    ignorePattern: '^import |^export {(.*?)}',
                    code: 200
                }
            ],
            'new-parens': 'off',
            'newline-per-chained-call': 'off',
            'no-bitwise': 'off',
            'no-caller': 'error',
            'no-cond-assign': 'off',
            'no-console': [
                'off',
                {
                    allow: [
                        'log',
                        'warn',
                        'dir',
                        'timeLog',
                        'assert',
                        'clear',
                        'count',
                        'countReset',
                        'group',
                        'groupEnd',
                        'table',
                        'debug',
                        'dirxml',
                        'error',
                        'groupCollapsed',
                        'Console',
                        'profile',
                        'profileEnd',
                        'timeStamp',
                        'context'
                    ]
                }
            ],
            'no-constant-condition': 'error',
            'no-control-regex': 'off',
            'no-debugger': 'error',
            'no-empty': 'off',
            'no-eval': 'off',
            'no-extra-semi': 'off',
            'no-fallthrough': 'error',
            'no-invalid-regexp': 'error',
            'no-invalid-this': 'off',
            'no-irregular-whitespace': 'off',
            'no-multiple-empty-lines': 'off',
            'no-new-wrappers': 'error',
            'no-redeclare': 'off',
            'no-regex-spaces': 'error',
            'no-return-await': 'error',
            'no-shadow': [
                'off',
                {
                    hoist: 'all'
                }
            ],
            'no-throw-literal': 'error',
            'no-trailing-spaces': 'error',
            'no-undef-init': 'error',
            'no-undef': 'error',
            'no-underscore-dangle': 'off',
            'no-unsafe-finally': 'error',
            'no-unused-expressions': [
                'error',
                {
                    allowTaggedTemplates: true,
                    allowShortCircuit: true
                }
            ],
            'no-unused-labels': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'one-var': ['off', 'never'],
            'prefer-arrow/prefer-arrow-functions': 'off',
            'prefer-const': 'error',
            'quote-props': 'off',
            radix: 'error',
            'space-before-function-paren': 'off',
            'spaced-comment': 'off',
            'use-isnan': 'error',
            'valid-typeof': 'off'
        }
    },
    {
        files: ['**/*.svelte'],
        languageOptions: {
            parser: svelteParser,
            sourceType: 'module',
            ecmaVersion: 2022,
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 2022,
                parser: tseslint.parser
            }
        },
        processor: 'svelte/svelte',
        rules: {
            'no-undef': 'off',
            'svelte/require-each-key': 'off',
            'svelte/no-reactive-reassign': 'off',
            'svelte/sort-attributes': 'warn',
            'svelte/no-inner-declarations': 'off',
            'svelte/valid-compile': [
                'error',
                {
                    ignoreWarnings: true
                }
            ]
        },
        settings: {
            svelte: {
                ignoreWarnings
            }
        }
    },
    {
        files: ['**/*.json'],
        ...json.configs['recommended'],
        rules: {
            'sort-keys': ['warn', 'asc', { caseSensitive: true, natural: false, minKeys: 2 }]
        }
    },
    {
        files: ['**/*.ts'],
        rules: {
            // 'eslint-plugin-svelte/parse-error': 'off',
            'no-undef': 'off'
        }
    }
];
