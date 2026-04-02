//
//  background.test.js
//  BlockShorts
//
//  Created by Udit Sehra on 02/04/26.

const { updateStats } = require('./background.js');

// Mock chrome/browser storage
global.chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn()
        }
    }
};

describe('Streak Logic Tests', () => {
    test('should increment streak if 10 minutes reached', async () => {
        const mockData = {
            timeSaved: 540, // 9 mins
            currentStreak: 5,
            dailyMinutes: 9,
            lastUsedDate: new Date().toLocaleDateString()
        };

        chrome.storage.local.get.mockImplementation((keys, cb) => cb(mockData));

        await updateStats(60); // Adding 1 minute to reach 10

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                currentStreak: 6, // Streak should increment
                dailyMinutes: 10
            })
        );
    });

    test('should reset streak if a day is missed', async () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const mockData = {
            currentStreak: 10,
            lastUsedDate: twoDaysAgo.toLocaleDateString()
        };

        chrome.storage.local.get.mockImplementation((keys, cb) => cb(mockData));

        await updateStats(60);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                currentStreak: 0 // Reset because day was missed
            })
        );
    });
});
