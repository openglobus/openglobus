module.exports = {
    env: {
        browser: true,
        jest: true,
        es2021: true
    },
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: 13,
        sourceType: "module"
    },
    rules: {
        "no-unused-vars": 0,
        "no-useless-escape": 0,
        "no-loss-of-precision": 0
    }
};
