//
//  blocking.spec.js
//  BlockShorts
//
//  Created by Udit Sehra on 02/04/26.
//

const { test, expect } = require('./fixtures');

test('Shorts shelf is hidden on YouTube search results', async ({ page }) => {
    await page.goto('https://www.youtube.com/results?search_query=mrbeast');
    // Wait for search results to render before asserting
    await page.waitForSelector('ytd-search', { timeout: 10000 });

    const shelf = page.locator('ytd-reel-shelf-renderer');
    expect(await shelf.isVisible()).toBe(false);
});

test('Direct /shorts/id URL redirects to /watch?v=id', async ({ page }) => {
    await page.goto('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    await page.waitForURL(/watch\?v=dQw4w9WgXcQ/, { timeout: 10000 });
    expect(page.url()).toContain('watch?v=dQw4w9WgXcQ');
});

test('Bare /shorts URL redirects to YouTube homepage', async ({ page }) => {
    await page.goto('https://www.youtube.com/shorts');
    await page.waitForURL('https://www.youtube.com/', { timeout: 10000 });
    expect(page.url()).toBe('https://www.youtube.com/');
});

test('Shorts feed page content is hidden after SPA navigation', async ({ page }) => {
    await page.goto('https://www.youtube.com/');
    await page.waitForSelector('ytd-app', { timeout: 10000 });

    // Simulate clicking the Shorts sidebar link via SPA navigation
    await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('yt-navigate-start'));
        history.pushState({}, '', '/shorts');
        window.dispatchEvent(new CustomEvent('yt-navigate-start'));
    });

    // After redirect, should be back on homepage
    await page.waitForURL('https://www.youtube.com/', { timeout: 5000 });
    expect(page.url()).toBe('https://www.youtube.com/');
});
