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
    a[href^="/shorts"],
    ytd-guide-entry-renderer:has(a[title="Shorts"]),
    ytd-mini-guide-entry-renderer:has(a[title="Shorts"]) {
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

// 3b. SIDEBAR BUTTON — guide renders asynchronously; MutationObserver fires the
//     instant the entry appears rather than relying on a fixed timeout.
//     Returns true if any entry was found and hidden (used to disconnect observer).
function hideSidebarShorts() {
    let found = false;
    document.querySelectorAll(
        "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytm-pivot-bar-item-renderer"
    ).forEach(el => {
        // title="Shorts" is the only stable identifier — href is Polymer-bound, not an attribute
        if (el.querySelector('a[title="Shorts"]')) {
            el.style.setProperty("display", "none", "important");
            found = true;
        }
    });
    return found;
}

let sidebarDebounce = null;
const sidebarObserver = new MutationObserver(() => {
    clearTimeout(sidebarDebounce);
    sidebarDebounce = setTimeout(() => {
        if (hideSidebarShorts()) sidebarObserver.disconnect();
    }, 50);
});
// document.documentElement always exists at document_start
sidebarObserver.observe(document.documentElement, { childList: true, subtree: true });

// On SPA navigation the guide may re-render — reconnect observer if needed
window.addEventListener("yt-navigate-finish", () => {
    setTimeout(() => {
        if (!hideSidebarShorts()) {
            sidebarObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
    }, 300);
});

// 3c. CLICK INTERCEPTOR — hard safety net; fires in capture phase before YouTube's
//     own handlers. href attribute is often absent (Polymer binding), so check
//     both the resolved href property and title="Shorts" as fallback
document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    let isShorts = false;
    try {
        if (link.href) {
            const url = new URL(link.href, location.origin);
            isShorts = url.hostname.endsWith("youtube.com") && url.pathname.startsWith("/shorts");
        }
    } catch {}
    if (!isShorts) isShorts = link.title === "Shorts";
    if (isShorts) {
        e.preventDefault();
        e.stopPropagation();
        let dest = "https://www.youtube.com/";
        try {
            const p = new URL(link.href, location.origin).pathname;
            const id = p.split("/")[2];
            if (id) dest = `/watch?v=${id}`;
        } catch {}
        window.location.replace(dest);
        api.runtime.sendMessage({ type: "SHORTS_BLOCKED" }).catch(() => {});
    }
}, true);

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
