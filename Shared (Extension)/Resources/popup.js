document.addEventListener("DOMContentLoaded", async () => {
    const toggle = document.getElementById("toggle");
    const api = typeof browser !== "undefined" ? browser : chrome;

    async function getStorageValue(key) {
        return new Promise((resolve) => {
            api.storage.local.get(key, (result) => {
                resolve(result[key] !== undefined ? result[key] : null);
            });
        });
    }

    // 1. Sync Toggle State
    const storedEnabled = await getStorageValue("blockShortsEnabled");
    const isEnabled = storedEnabled === null ? true : storedEnabled;
    toggle.checked = isEnabled;

    // 2. Load and Display Stats
    const stats = await api.storage.local.get(["timeSaved", "currentStreak"]);
    
    // Format Time Display
    const totalSeconds = stats.timeSaved || 0;
    const mins = Math.floor(totalSeconds / 60);
    const displayElement = document.getElementById("timeSavedDisplay");
    
    if (mins >= 60) {
        const hrs = (mins / 60).toFixed(1);
        displayElement.innerText = `${hrs} hrs`;
    } else {
        displayElement.innerText = `${mins} min`;
    }

    // Update Streak Display
    const streak = stats.currentStreak || 0;
    const streakElement = document.getElementById("streakCount");
    streakElement.innerText = `${streak} ${streak === 1 ? 'Day' : 'Days'}`;

    if (streak >= 7) {
        streakElement.style.color = "#ff9500"; // Gold for Focus Masters
        streakElement.innerText += " 🏆";
    }

    // 3. Toggle Change Listener
    toggle.addEventListener("change", async () => {
        const newState = toggle.checked;
        await api.storage.local.set({ blockShortsEnabled: newState });

        api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
                api.tabs.sendMessage(tabs[0].id, {
                    type: "TOGGLE_SHORTS",
                    enabled: newState
                }, () => {
                    if (api.runtime.lastError) {
                        console.log("Tab not YouTube or not ready.");
                    }
                });
            }
        });
    });
});
