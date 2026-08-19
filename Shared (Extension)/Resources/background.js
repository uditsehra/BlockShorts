const api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ADD_TIME") {
        updateStats(request.amount);
        return true;
    }
    if (request.type === "SHORTS_BLOCKED") {
        incrementBlockedCount();
        return true;
    }
});

api.runtime.onInstalled.addListener(async () => {
    const data = await api.storage.local.get("blockShortsEnabled");
    if (data.blockShortsEnabled === undefined) {
        await api.storage.local.set({ blockShortsEnabled: true });
    }
    syncRedirectRule(data.blockShortsEnabled !== false);
});

// Re-sync the DNR ruleset after browser restart — onInstalled doesn't fire on startup
api.runtime.onStartup.addListener(async () => {
    const data = await api.storage.local.get("blockShortsEnabled");
    syncRedirectRule(data.blockShortsEnabled !== false);
});

api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.blockShortsEnabled !== undefined) {
        syncRedirectRule(changes.blockShortsEnabled.newValue !== false);
    }
});

function syncRedirectRule(enabled) {
    api.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: enabled ? ["ruleset_redirect"] : [],
        disableRulesetIds: enabled ? [] : ["ruleset_redirect"]
    }).catch(err => console.error("Failed to sync redirect rule:", err));
}

// Locale-safe ISO date (local time, not UTC) — avoids streak resets on locale change
function todayISO(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function updateStats(secondsToAdd) {
    try {
        const data = await api.storage.local.get(["timeSaved", "lastUsedDate", "currentStreak", "dailyMinutes"]);

        let totalSeconds = (data.timeSaved || 0) + secondsToAdd;
        const today = todayISO();
        let currentStreak = data.currentStreak || 0;
        let dailyMinutes = data.dailyMinutes || 0;

        if (data.lastUsedDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (data.lastUsedDate !== todayISO(yesterday) && data.lastUsedDate !== undefined) {
                currentStreak = 0;
            }
            dailyMinutes = 0;
        }

        const prevDailyMinutes = dailyMinutes;
        dailyMinutes += secondsToAdd / 60;

        if (dailyMinutes >= 10 && prevDailyMinutes < 10) {
            currentStreak++;
        }

        await api.storage.local.set({
            timeSaved: totalSeconds,
            lastUsedDate: today,
            currentStreak,
            dailyMinutes
        });
    } catch (err) {
        console.error("Failed to update stats:", err);
    }
}

async function incrementBlockedCount() {
    try {
        const data = await api.storage.local.get("shortsBlocked");
        await api.storage.local.set({ shortsBlocked: (data.shortsBlocked || 0) + 1 });
    } catch (err) {
        console.error("Failed to increment blocked count:", err);
    }
}

if (typeof module !== "undefined") {
    module.exports = { updateStats, incrementBlockedCount, todayISO };
}
