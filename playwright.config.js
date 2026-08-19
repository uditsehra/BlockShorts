const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: 'Shared (Extension)/Tests/E2E',
    timeout: 30_000,
    retries: 1,
    reporter: 'list',
    // Extensions require a headed browser — no headless mode
    use: {
        headless: false,
    },
});
