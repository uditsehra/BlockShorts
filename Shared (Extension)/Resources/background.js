const api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ADD_TIME") {
        updateStats(request.amount);
    }
});

async function updateStats(secondsToAdd) {
    const data = await api.storage.local.get(["timeSaved", "lastUsedDate", "currentStreak", "dailyMinutes"]);
    
    let totalSeconds = (data.timeSaved || 0) + secondsToAdd;
    let today = new Date().toLocaleDateString();
    let currentStreak = data.currentStreak || 0;
    let dailyMinutes = data.dailyMinutes || 0;

    // Check if it's a new day
    if (data.lastUsedDate !== today) {
        // If they missed a day, reset streak (optional: give 1 day grace)
        if (isYesterday(data.lastUsedDate)) {
            // Keep streak going
        } else {
            currentStreak = 0;
        }
        dailyMinutes = 0;
    }

    dailyMinutes += (secondsToAdd / 60);

    // Goal: 10 minutes a day to increment streak
    if (dailyMinutes >= 10 && data.lastUsedDate !== today) {
        currentStreak++;
    }

    await api.storage.local.set({
        timeSaved: totalSeconds,
        lastUsedDate: today,
        currentStreak: currentStreak,
        dailyMinutes: dailyMinutes
    });
}

function isYesterday(dateString) {
    if (!dateString) return false;
    const today = new Date();
    const lastDate = new Date(dateString);
    const diff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    return diff === 1;
}
