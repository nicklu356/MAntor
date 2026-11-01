// Best-effort ad blocker detection, used to explain why the Google sign-in window did not open.
// Ad blockers (uBlock Origin, AdBlock, Adblock Plus, Brave Shields...) hide page elements that look
// like ads, and block ad scripts. Some of them also block or instantly close pop-up windows,
// which stops Google sign-in.

// Quick check without any network request: is a fake "ad" element hidden by the page's filters?
export async function adElementIsHidden() {
  if (typeof document === "undefined") return false;
  const bait = document.createElement("div");
  bait.className = "adsbox ad-banner ad-placement textads banner-ads pub_300x250";
  bait.setAttribute("aria-hidden", "true");
  bait.style.cssText = "position:absolute;left:-10000px;top:-10000px;width:10px;height:10px;";
  bait.innerHTML = "&nbsp;";
  document.body.appendChild(bait);
  await new Promise((resolve) => setTimeout(resolve, 200)); // filters apply asynchronously
  const style = window.getComputedStyle(bait);
  const hidden = bait.offsetHeight === 0 || style.display === "none" || style.visibility === "hidden";
  bait.remove();
  return hidden;
}

// Fuller check, only after something failed: is a well-known ad script blocked?
async function adScriptIsBlocked() {
  try {
    await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
    });
    return false;
  } catch {
    return true;
  }
}

let fullCheck = null;
export function detectAdBlocker() {
  if (!fullCheck) fullCheck = Promise.all([adElementIsHidden(), adScriptIsBlocked()]).then(([a, b]) => a || b);
  return fullCheck;
}
