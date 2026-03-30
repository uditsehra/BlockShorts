const api = typeof browser !== "undefined" ? browser : chrome;

function getStorage(key) {
    return new Promise((resolve) => {
        api.storage.local.get(key, (result) => {
            resolve(result);
        });
    });
}

function setStorage(data) {
    return new Promise((resolve) => {
        api.storage.local.set(data, () => {
            resolve();
        });
    });
}

let isEnabled = false;
let isInitialized = false;

async function initState() {
    const data = await getStorage("blockShortsEnabled");

    // Default to false if not set
    if (data.blockShortsEnabled === undefined) {
        isEnabled = false;
    } else {
        isEnabled = data.blockShortsEnabled;
    }
}

/* --- Inject CSS --- */
function injectStyle() {
    if (document.getElementById("no-shorts-style")) return;

    const style = document.createElement("style");
    style.id = "no-shorts-style";
    style.innerHTML = `
    ytd-reel-shelf-renderer {
        display: none !important;
    }
    `;
    document.documentElement.appendChild(style);
}

function removeStyle() {
    document.getElementById("no-shorts-style")?.remove();
}

/* --- Remove Shorts --- */
function removeShorts() {
    if (!isEnabled) return;

    // Remove main Shorts shelf
    document.querySelectorAll("ytd-reel-shelf-renderer").forEach(el => el.remove());

    // Remove any section containing "Shorts" text
    document.querySelectorAll("ytd-rich-section-renderer").forEach(section => {
        const text = section.innerText?.toLowerCase() || "";
        if (text.includes("shorts")) {
            section.remove();
        }
    });

    // Disable ALL Shorts links
    document.querySelectorAll("a[href*='/shorts/']").forEach(link => {
        link.removeAttribute("href");
        link.style.pointerEvents = "none";
        link.style.display = "none";
    });
}

// Ensure blocking is re-applied in case of async YouTube UI changes
function reapplyShortsBlock() {
    injectStyle();
    removeShorts();
    setTimeout(() => {
        injectStyle();
        removeShorts();
    }, 500);
    setTimeout(() => {
        injectStyle();
        removeShorts();
    }, 1500);
}

/* --- Observer --- */
const observer = new MutationObserver(() => {
    if (!isInitialized || !isEnabled) return;

    injectStyle();
    removeShorts();

    if (window.location.pathname.startsWith("/shorts/")) {
        const id = window.location.pathname.split("/")[2];
        if (id) window.location.replace(`/watch?v=${id}`);
    }
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

/* --- Init --- */
(async () => {
    await initState();
    isInitialized = true;

    if (isEnabled) {
        injectStyle();
        removeShorts();

        if (window.location.pathname.startsWith("/shorts/")) {
            const id = window.location.pathname.split("/")[2];
            if (id) window.location.replace(`/watch?v=${id}`);
        }
    }
})();

/* --- Toggle Listener --- */
api.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_SHORTS") {
        isEnabled = msg.enabled;

        if (!isEnabled) {
            removeStyle();
            location.reload();
        } else {
            reapplyShortsBlock();
        }
    }
});
