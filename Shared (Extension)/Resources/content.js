const api = typeof browser !== "undefined" ? browser : chrome;

// 1. SIMPLE CSS (No :has, no performance cost)
const style = document.createElement("style");
style.id = "no-shorts-stable-style";
style.textContent = `
    ytd-reel-shelf-renderer,
    grid-shelf-view-model,
    ytm-shorts-lockup-view-model,
    ytd-shorts,
    ytd-reel-video-renderer,
    ytd-shorts-lockup-view-model,
    a[href*="/shorts/"],
    a[href="/shorts"] {
        display: none !important;
    }
`;

// 2. IMMEDIATE ACTION
// We assume it's ON by default to prevent flicker.
document.documentElement.appendChild(style);

// Check storage asynchronously to see if we should turn it OFF
api.storage.local.get("blockShortsEnabled", (res) => {
    if (res.blockShortsEnabled === false) {
        style.remove();
    }
});

// 3. REDIRECT for SPA navigations (initial hard-navigations handled by declarativeNetRequest)
function checkRedirect() {
    const path = window.location.pathname;
    if (path.startsWith("/shorts")) {
        const id = path.split("/")[2];
        window.location.replace(id ? `/watch?v=${id}` : "https://www.youtube.com/");
    }
}
// yt-navigate-start fires after YouTube calls history.pushState, so location is already updated
window.addEventListener("yt-navigate-start", checkRedirect);
// yt-navigate-finish is a safety net for navigations that bypass yt-navigate-start
window.addEventListener("yt-navigate-finish", checkRedirect);

// 4. HEARTBEAT (For stats)
setInterval(() => {
    if (document.contains(style) && !document.hidden) {
        api.runtime.sendMessage({ type: "ADD_TIME", amount: 60 }).catch(()=>({}));
    }
}, 60000);

// 5. TOGGLE
api.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_SHORTS") {
        if (msg.enabled) {
            document.documentElement.appendChild(style);
        } else {
            style.remove();
        }
    }
});
