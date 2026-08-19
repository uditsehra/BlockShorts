document.addEventListener("DOMContentLoaded", async () => {
    const api = typeof browser !== "undefined" ? browser : chrome;
    const toggle = document.getElementById("toggle");
    const streakElement = document.getElementById("streakCount");
    const timeElement = document.getElementById("timeSavedDisplay");
    const blockedElement = document.getElementById("shortsBlockedDisplay");
    const blockedRow = document.getElementById("blockedRow");

    try {
        const data = await api.storage.local.get(["blockShortsEnabled", "timeSaved", "currentStreak", "shortsBlocked"]);

        toggle.checked = data.blockShortsEnabled !== false;

        const streak = data.currentStreak || 0;
        streakElement.innerText = `${streak} ${streak === 1 ? "Day" : "Days"}`;
        streakElement.setAttribute("aria-label", `Streak: ${streak} ${streak === 1 ? "day" : "days"}`);
        if (streak > 0) streakElement.classList.add("streak-active");

        const totalSeconds = data.timeSaved || 0;
        const mins = Math.floor(totalSeconds / 60);
        const timeText = mins >= 60 ? `${(mins / 60).toFixed(1)} hrs` : `${mins} min`;
        timeElement.innerText = timeText;
        timeElement.setAttribute("aria-label", `Focus time: ${timeText}`);

        const blocked = data.shortsBlocked || 0;
        blockedElement.innerText = blocked.toLocaleString();
        blockedRow.setAttribute("aria-label", `${blocked.toLocaleString()} Shorts blocked total`);
    } catch (err) {
        console.error("Failed to load popup data:", err);
    }

    toggle.addEventListener("change", async () => {
        const newState = toggle.checked;
        try {
            await api.storage.local.set({ blockShortsEnabled: newState });
        } catch (err) {
            console.error("Failed to save toggle state:", err);
            toggle.checked = !newState; // revert UI if storage write failed
            return;
        }

        // Notify the active YouTube tab — use Promise style for Safari compatibility
        try {
            const tabs = await api.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
                await api.tabs.sendMessage(tabs[0].id, {
                    type: "TOGGLE_SHORTS",
                    enabled: newState
                }).catch(() => {}); // Silently ignore if tab is not YouTube
            }
        } catch {
            // tabs API unavailable or tab not accessible — not critical
        }
    });
});
