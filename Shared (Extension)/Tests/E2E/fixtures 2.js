const { test: base, chromium } = require('@playwright/test');
const path = require('path');
const os = require('os');
const fs = require('fs');

const extensionPath = path.resolve(__dirname, '../../Resources');

exports.test = base.extend({
    context: async ({}, use) => {
        // Fresh profile per run — prevents stale extension state from breaking tests
        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blockshorts-'));
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
        await use(context);
        await context.close();
        fs.rmSync(userDataDir, { recursive: true, force: true });
    },
    page: async ({ context }, use) => {
        const page = await context.newPage();
        await use(page);
        await page.close();
    },
});

exports.expect = base.expect;
