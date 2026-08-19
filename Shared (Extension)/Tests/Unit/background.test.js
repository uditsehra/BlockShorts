//
//  background.test.js
//  BlockShorts
//
//  Created by Udit Sehra on 02/04/26.

// Full mock must be set up before require() so module-level listeners don't throw
global.chrome = {
    runtime: {
        onMessage: { addListener: jest.fn() },
        onInstalled: { addListener: jest.fn() }
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

const { updateStats } = require('../../Resources/background.js');

describe('Streak Logic Tests', () => {
    beforeEach(() => {
        chrome.storage.local.set.mockClear();
    });

    test('should increment streak when crossing 10-minute threshold', async () => {
        chrome.storage.local.get.mockResolvedValue({
            timeSaved: 540,       // 9 min in seconds
            currentStreak: 5,
            dailyMinutes: 9,      // 1 min away from threshold
            lastUsedDate: new Date().toLocaleDateString()
        });

        await updateStats(60); // +1 min → crosses 10-min threshold

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                currentStreak: 6,
                dailyMinutes: 10
            })
        );
    });

    test('should not double-increment streak on same day after threshold', async () => {
        chrome.storage.local.get.mockResolvedValue({
            timeSaved: 600,       // already 10 min
            currentStreak: 5,
            dailyMinutes: 10,     // already at threshold
            lastUsedDate: new Date().toLocaleDateString()
        });

        await updateStats(60); // +1 min, already past threshold

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                currentStreak: 5  // unchanged
            })
        );
    });

    test('should reset streak if a day is missed', async () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        chrome.storage.local.get.mockResolvedValue({
            currentStreak: 10,
            lastUsedDate: twoDaysAgo.toLocaleDateString()
        });

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                currentStreak: 0
            })
        );
    });

    test('should not reset streak if last used was yesterday', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        chrome.storage.local.get.mockResolvedValue({
            currentStreak: 7,
            dailyMinutes: 0,
            lastUsedDate: yesterday.toLocaleDateString()
        });

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                currentStreak: 7  // preserved, not reset
            })
        );
    });
});
