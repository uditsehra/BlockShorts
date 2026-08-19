//
//  background.test.js
//  BlockShorts
//
//  Created by Udit Sehra on 02/04/26.

// Full mock must be set up before require() so module-level listeners don't throw
global.chrome = {
    runtime: {
        onMessage: { addListener: jest.fn() },
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() }
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn().mockResolvedValue(undefined)
        },
        onChanged: { addListener: jest.fn() }
    },
    declarativeNetRequest: {
        updateEnabledRulesets: jest.fn().mockResolvedValue(undefined)
    }
};

const { updateStats, incrementBlockedCount, todayISO } = require("../../Resources/background.js");

// Helper matching background.js's todayISO — locale-safe
function isoDate(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("todayISO", () => {
    test("returns YYYY-MM-DD format regardless of locale", () => {
        const result = todayISO();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("accepts a Date argument", () => {
        const d = new Date(2026, 0, 5); // Jan 5 2026
        expect(todayISO(d)).toBe("2026-01-05");
    });
});

describe("Streak Logic Tests", () => {
    beforeEach(() => {
        chrome.storage.local.set.mockClear();
    });

    test("should increment streak when crossing 10-minute threshold", async () => {
        chrome.storage.local.get.mockResolvedValue({
            timeSaved: 540,
            currentStreak: 5,
            dailyMinutes: 9,
            lastUsedDate: isoDate()
        });

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({ currentStreak: 6, dailyMinutes: 10 })
        );
    });

    test("should not double-increment streak on same day after threshold", async () => {
        chrome.storage.local.get.mockResolvedValue({
            timeSaved: 600,
            currentStreak: 5,
            dailyMinutes: 10,
            lastUsedDate: isoDate()
        });

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({ currentStreak: 5 })
        );
    });

    test("should reset streak if a day is missed", async () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        chrome.storage.local.get.mockResolvedValue({
            currentStreak: 10,
            lastUsedDate: isoDate(twoDaysAgo)
        });

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({ currentStreak: 0 })
        );
    });

    test("should not reset streak if last used was yesterday", async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        chrome.storage.local.get.mockResolvedValue({
            currentStreak: 7,
            dailyMinutes: 0,
            lastUsedDate: isoDate(yesterday)
        });

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({ currentStreak: 7 })
        );
    });

    test("should use ISO date format in lastUsedDate", async () => {
        chrome.storage.local.get.mockResolvedValue({});

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({ lastUsedDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
        );
    });
});

describe("Shorts Blocked Counter", () => {
    beforeEach(() => {
        chrome.storage.local.set.mockClear();
    });

    test("should initialise shortsBlocked to 1 on first block", async () => {
        chrome.storage.local.get.mockResolvedValue({});

        await incrementBlockedCount();

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ shortsBlocked: 1 });
    });

    test("should increment existing shortsBlocked count", async () => {
        chrome.storage.local.get.mockResolvedValue({ shortsBlocked: 41 });

        await incrementBlockedCount();

        expect(chrome.storage.local.set).toHaveBeenCalledWith({ shortsBlocked: 42 });
    });
});
