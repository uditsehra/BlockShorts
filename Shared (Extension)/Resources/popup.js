document.addEventListener("DOMContentLoaded", async () => {
    const toggle = document.getElementById("toggle");
    const api = typeof browser !== "undefined" ? browser : chrome;
    // Helper to get data from browser storage (mirrors content.js)
    function getStorage(key) {
        return new Promise((resolve) => {
            const api = typeof browser !== "undefined" ? browser : chrome;
            api.storage.local.get(key, (result) => {
                resolve(result);
            });
        });
    }
    // Load saved state
    const data = await getStorage("blockShortsEnabled") || {};
    const isEnabled = data.blockShortsEnabled !== false;

    toggle.checked = isEnabled;

    toggle.addEventListener("change", async () => {
        const enabled = toggle.checked;
        await api.storage.local.set({ blockShortsEnabled: enabled });
        api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
                api.tabs.sendMessage(tabs[0].id, {
                    type: "TOGGLE_SHORTS",
                    enabled: enabled
                });
            }
        });
    });

    // Load time saved
    const stats = await api.storage.local.get("timeSaved");
    let seconds = stats.timeSaved || 0;

    let display = "0 min";

    if (seconds >= 60) {
        const mins = Math.floor(seconds / 60);
        display = `${mins} min`;
    }

    document.getElementById("timeSaved").innerText = display;
});
