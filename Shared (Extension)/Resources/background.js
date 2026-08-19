const api = typeof browser !== "undefined" ? browser : chrome;

// ONLY respond to events. Do not run logic at the top of the file.
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ADD_TIME") {
        updateStats(request.amount);
        return true;
    }
});

api.runtime.onInstalled.addListener(() => {
    api.storage.local.get("blockShortsEnabled", (data) => {
        if (data.blockShortsEnabled === undefined) {
            api.storage.local.set({ blockShortsEnabled: true });
        }
        syncRedirectRule(data.blockShortsEnabled !== false);
    });
});

// Keep the declarativeNetRequest redirect rule in sync with the toggle
api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.blockShortsEnabled !== undefined) {
        syncRedirectRule(changes.blockShortsEnabled.newValue !== false);
    }
});

function syncRedirectRule(enabled) {
    api.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: enabled ? ["ruleset_redirect"] : [],
        disableRulesetIds: enabled ? [] : ["ruleset_redirect"]
    });
}

if (typeof module !== "undefined") {
    module.exports = { updateStats };
}

async function updateStats(secondsToAdd) {
    try {
            const data = await api.storage.local.get(["timeSaved", "lastUsedDate", "currentStreak", "dailyMinutes"]);
            
            let totalSeconds = (data.timeSaved || 0) + secondsToAdd;
            let today = new Date().toLocaleDateString();
            let currentStreak = data.currentStreak || 0;
            let dailyMinutes = data.dailyMinutes || 0;

            if (data.lastUsedDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toLocaleDateString();
                
                if (data.lastUsedDate !== yesterdayStr && data.lastUsedDate !== undefined) {
                    currentStreak = 0;
                }
                dailyMinutes = 0;
            }

            const prevDailyMinutes = dailyMinutes;
            dailyMinutes += (secondsToAdd / 60);

            // Increment streak exactly once — when crossing the 10-min threshold for the day
            if (dailyMinutes >= 10 && prevDailyMinutes < 10) {
                currentStreak++;
            }

            await api.storage.local.set({
                timeSaved: totalSeconds,
                lastUsedDate: today,
                currentStreak: currentStreak,
                dailyMinutes: dailyMinutes
            });
        } catch (error) {
            console.error("Failed to update stats:", error);
        }
}
