//const api = typeof browser !== "undefined" ? browser : chrome;
//
//async function getEnabledState() {
//    return new Promise((resolve) => {
//        api.storage.local.get("blockShortsEnabled", (result) => {
//            resolve(result.blockShortsEnabled !== false);
//        });
//    });
//}
//
//let isEnabled = false;
//
///* --- THE CSS GUARD (Immediate & Fast) --- */
//function injectStyle() {
//    if (document.getElementById("no-shorts-style")) return;
//    const style = document.createElement("style");
//    style.id = "no-shorts-style";
//    style.innerHTML = `
//        /* Sidebar & Chips */
//        ytd-guide-entry-renderer:has(a[title="Shorts"]),
//        ytd-mini-guide-entry-renderer:has(a[title="Shorts"]),
//        yt-chip-cloud-chip-renderer:has(yt-formatted-string[title="Shorts"]),
//
//        /* Shelves & Grid Models (The horizontal blocks) */
//        grid-shelf-view-model,
//        ytd-reel-shelf-renderer,
//        ytd-item-section-renderer:has(grid-shelf-view-model),
//        ytd-item-section-renderer:has(ytd-reel-shelf-renderer),
//
//        /* Search Results List View (The ones in your latest screenshot) */
//        ytd-video-renderer:has(a[href*="/shorts/"]),
//        ytd-video-renderer:has(.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]),
//        
//        /* General individual items */
//        ytm-shorts-lockup-view-model,
//        ytm-shorts-lockup-view-model-v2,
//        ytd-rich-item-renderer:has(a[href*="/shorts/"]) {
//            display: none !important;
//        }
//    `;
//    document.documentElement.appendChild(style);
//}
//
//function removeStyle() {
//    document.getElementById("no-shorts-style")?.remove();
//}
//
///* --- THE JS CLEANER (Only for things CSS misses) --- */
//function removeShorts() {
//    if (!isEnabled) return;
//
//    // Use a more specific selector to avoid scanning everything
//    const shortsLinks = document.querySelectorAll("a[href*='/shorts/']");
//    shortsLinks.forEach(link => {
//        const entry = link.closest("ytd-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-reel-shelf-renderer, grid-shelf-view-model");
//        if (entry && entry.style.display !== "none") {
//            entry.style.setProperty("display", "none", "important");
//        }
//    });
//}
//
//function handleShortsRedirect() {
//    if (isEnabled && window.location.pathname.startsWith("/shorts/")) {
//        const id = window.location.pathname.split("/")[2];
//        window.location.replace(id ? `/watch?v=${id}` : 'https://www.youtube.com/');
//    }
//}
//
//async function applyBlocking() {
//    isEnabled = await getEnabledState();
//    if (isEnabled) {
//        injectStyle();
//        removeShorts();
//        handleShortsRedirect();
//    } else {
//        removeStyle();
//    }
//}
//
///* --- THE PERFORMANCE FIX: Debounced Observer --- */
//let timeout = null;
//const observer = new MutationObserver(() => {
//    if (!isEnabled) return;
//    
//    // Debounce: Wait for YouTube to finish its current batch of updates
//    // before we run our heavy cleaning logic.
//    clearTimeout(timeout);
//    timeout = setTimeout(() => {
//        removeShorts();
//        handleShortsRedirect();
//    }, 100); // 100ms delay stops the "lag"
//});
//
//observer.observe(document.documentElement, {
//    childList: true,
//    subtree: true
//});
//
//applyBlocking();
//
//api.runtime.onMessage.addListener((msg) => {
//    if (msg.type === "TOGGLE_SHORTS") {
//        isEnabled = msg.enabled;
//        if (isEnabled) {
//            applyBlocking();
//        } else {
//            removeStyle();
//            location.reload();
//        }
//    }
//});


const api = typeof browser !== "undefined" ? browser : chrome;
let isEnabled = false;

// 1. Instant CSS Injection
const styleNode = document.createElement("style");
styleNode.id = "block-shorts-permanent-style";
styleNode.innerHTML = `
    /* HIDE EVERYTHING WITH SHORTS IN THE URL OR ATTRIBUTES */
    [href*="/shorts/"],
    :has(> [href*="/shorts/"]),
    ytd-reel-shelf-renderer,
    grid-shelf-view-model,
    [is-shorts],
    ytd-video-renderer:has(a[href*="/shorts/"]),
    yt-chip-cloud-chip-renderer:has([title="Shorts"]),
    ytd-guide-entry-renderer:has([title="Shorts"]) {
        display: none !important;
    }
`;

async function applyState() {
    const data = await api.storage.local.get("blockShortsEnabled");
    isEnabled = data.blockShortsEnabled !== false;

    if (isEnabled) {
        document.documentElement.appendChild(styleNode);
        checkRedirect();
    } else {
        styleNode.remove();
    }
}

function checkRedirect() {
    if (isEnabled && window.location.pathname.startsWith("/shorts/")) {
        const videoId = window.location.pathname.split("/")[2];
        if (videoId) window.location.replace(`/watch?v=${videoId}`);
    }
}

// 2. Navigation Listener (Handles YouTube's "In-Page" navigation)
window.addEventListener("yt-navigate-start", checkRedirect);
window.addEventListener("yt-page-data-updated", checkRedirect);

// 3. Simple Observer (Only for Redirects, not for Hiding)
const observer = new MutationObserver(checkRedirect);
observer.observe(document.head, { childList: true });

applyState();

api.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_SHORTS") {
        isEnabled = msg.enabled;
        applyState();
        if (!isEnabled) location.reload();
    }
});

// Send a heartbeat every 60 seconds if the tab is active and blocking is on
setInterval(() => {
    if (isEnabled && !document.hidden && window.location.hostname.includes("youtube.com")) {
        api.runtime.sendMessage({ type: "ADD_TIME", amount: 60 });
    }
}, 60000);
