document.addEventListener("DOMContentLoaded", async () => {
    const api = typeof browser !== "undefined" ? browser : chrome;
    const toggle = document.getElementById("toggle");
    const streakElement = document.getElementById("streakCount");
    const timeElement = document.getElementById("timeSavedDisplay");

    // 1. Sync Toggle State from Storage
    const data = await api.storage.local.get(["blockShortsEnabled", "timeSaved", "currentStreak"]);
    
    const isEnabled = data.blockShortsEnabled !== false;
    toggle.checked = isEnabled;

    // 2. Update Stats Display
    const streak = data.currentStreak || 0;
    streakElement.innerText = `${streak} ${streak === 1 ? 'Day' : 'Days'}`;
    if (streak > 0) streakElement.classList.add("streak-active");

    const totalSeconds = data.timeSaved || 0;
    const mins = Math.floor(totalSeconds / 60);

    if (mins >= 60) {
        timeElement.innerText = `${(mins / 60).toFixed(1)} hrs`;
    } else {
        timeElement.innerText = `${mins} min`;
    }

    // 3. Handle Toggle Logic
    toggle.addEventListener("change", async () => {
        const newState = toggle.checked;
        await api.storage.local.set({ blockShortsEnabled: newState });

        // Notify active tab (if it's YouTube)
        api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                api.tabs.sendMessage(tabs[0].id, {
                    type: "TOGGLE_SHORTS",
                    enabled: newState
                }, () => {
                    if (api.runtime.lastError) { /* Ignore non-YT tabs */ }
                });
            }
        });
    });
});
