const { test: base, chromium } = require('@playwright/test');
const path = require('path');
const os = require('os');

const extensionPath = path.resolve(__dirname, '../../Resources');
// Persistent user data dir so Chrome remembers the extension across test runs
const userDataDir = path.join(os.tmpdir(), 'blockshorts-e2e-profile');

exports.test = base.extend({
    context: async ({}, use) => {
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
        await use(context);
        await context.close();
    },
    page: async ({ context }, use) => {
        const page = await context.newPage();
        await use(page);
        await page.close();
    },
});

exports.expect = base.expect;
