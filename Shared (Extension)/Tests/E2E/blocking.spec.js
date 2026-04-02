//
//  blocking.spec.js
//  BlockShorts
//
//  Created by Udit Sehra on 02/04/26.
//

const { test, expect } = require('@playwright/test');

test('Shorts shelf should be hidden on YouTube search', async ({ page }) => {
    // 1. Go to YouTube search
    await page.goto('https://www.youtube.com/results?search_query=mrbeast');

    // 2. Wait for content to load
    await page.waitForTimeout(2000);

    // 3. Check if the shelf exists but is hidden
    const shelf = page.locator('ytd-reel-shelf-renderer');
    
    // It should either be removed from DOM or have display: none
    const isVisible = await shelf.isVisible();
    expect(isVisible).toBe(false);
});

test('Should redirect /shorts/ URL to /watch?v=', async ({ page }) => {
    // 1. Try to visit a direct Shorts link
    await page.goto('https://www.youtube.com/shorts/dQw4w9WgXcQ');

    // 2. Wait for redirect
    await page.waitForURL(/.*watch\?v=.*/);

    // 3. Confirm URL structure
    expect(page.url()).toContain('watch?v=dQw4w9WgXcQ');
});
