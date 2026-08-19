const api = typeof browser !== "undefined" ? browser : chrome;

// 1. CSS — element selectors are fast; a[href*=] is costlier on YouTube's dense
//    DOM but required for Shorts links outside shelf/reel container elements
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

// Declared before the async storage check so all code paths reference the same binding
let visibleSince = null;

// 2. IMMEDIATE ACTION — inject before async check to prevent flicker when enabled
document.documentElement.appendChild(style);

// Use Promise style — Safari's browser.* API is Promise-only; callbacks are ignored
api.storage.local.get("blockShortsEnabled").then(res => {
    if (res.blockShortsEnabled === false) {
        style.remove();
    } else {
        if (!document.hidden) visibleSince = Date.now();
    }
});

// 3. REDIRECT for SPA navigations (hard-navigations handled by declarativeNetRequest)
// Debounce prevents double-counting when both yt-navigate-start and yt-navigate-finish
// fire for the same /shorts navigation
let lastBlockedPath = null;

function checkRedirect() {
    const path = window.location.pathname;
    if (path.startsWith("/shorts") && path !== lastBlockedPath) {
        lastBlockedPath = path;
        setTimeout(() => { lastBlockedPath = null; }, 2000);
        const id = path.split("/")[2];
        window.location.replace(id ? `/watch?v=${id}` : "https://www.youtube.com/");
        api.runtime.sendMessage({ type: "SHORTS_BLOCKED" }).catch(() => {});
    }
}
window.addEventListener("yt-navigate-start", checkRedirect);
window.addEventListener("yt-navigate-finish", checkRedirect);

// 4. TIME TRACKING — visibilitychange captures partial minutes accurately;
//    pageshow handles BFCache restoration; pagehide and 5-min interval are safety nets
function flushElapsedTime() {
    if (visibleSince === null || !document.contains(style)) return;
    const seconds = Math.round((Date.now() - visibleSince) / 1000);
    visibleSince = Date.now();
    if (seconds > 0) {
        api.runtime.sendMessage({ type: "ADD_TIME", amount: seconds }).catch(() => {});
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        flushElapsedTime();
        visibleSince = null;
    } else {
        if (document.contains(style)) visibleSince = Date.now();
    }
});

// Resume timing when a page is restored from the Back-Forward Cache
window.addEventListener("pageshow", (e) => {
    if (e.persisted && !document.hidden && document.contains(style)) {
        visibleSince = Date.now();
    }
});

window.addEventListener("pagehide", flushElapsedTime);
setInterval(flushElapsedTime, 5 * 60 * 1000);

// 5. TOGGLE
api.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_SHORTS") {
        if (msg.enabled) {
            document.documentElement.appendChild(style);
            if (!document.hidden) visibleSince = Date.now();
        } else {
            flushElapsedTime();
            visibleSince = null;
            style.remove();
        }
    }
});
