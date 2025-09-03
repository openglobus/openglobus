import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import {fileURLToPath} from "node:url";
import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    ...compat.extends("eslint:recommended"),

    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            globals: {
                window: true,
                vi: true,
                test: true,
                expect: true,
                describe: true,
                it: true,
                beforeEach: true,
                afterEach: true,
                beforeAll: true,
                afterAll: true
            },

            parser: tsParser,
            ecmaVersion: 13,
            sourceType: "module",
        },

        rules: {
            "no-unused-vars": 0,
            "no-useless-escape": 0,
            "no-loss-of-precision": 0,
        },

    },

    {
        files: ["**/*.worker.js", "**/*.worker.ts"],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                self: true,
                postMessage: true,
                addEventListener: true,
                removeEventListener: true
            }
        },
        rules: {
            "no-undef": 0 // отключаем проверку на "self is not defined"
        }
    }];