import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Production only: a service worker mid-HMR makes dev caching misery.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* not installable here (e.g. plain http) — the site works regardless */
    });
  });
}

// iOS standalone keyboard handling for the fixed app shell.
//
// The root cannot scroll (overflow: hidden), but iOS's keyboard manager PANS
// the whole window anyway when a focused input would be covered — and a panned
// window exposes the native-painted region beyond the document: the stripe.
// Two countermeasures:
//   1. On focus, centre the input inside the INNER scroller before iOS decides
//      it needs to pan the window at all.
//   2. Any nonzero window.scrollY on this page IS the keyboard pan (the root
//      has no legal scroll position but 0) — snap it back once focus leaves.
function restoreViewport() {
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
  if (window.scrollY !== 0) window.scrollTo(0, 0);
  window.scrollBy(0, 1);
  window.scrollBy(0, -1);
}

document.addEventListener("focusin", (event) => {
  const el = event.target;
  if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
  setTimeout(() => {
    if (document.activeElement === el) {
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, 60);
});

if ("visualViewport" in window) {
  let keyboardWasOpen = false;
  window.visualViewport.addEventListener("resize", () => {
    const open = window.visualViewport.height < window.innerHeight * 0.8;
    if (keyboardWasOpen && !open) setTimeout(restoreViewport, 80);
    keyboardWasOpen = open;
  });
}
document.addEventListener("focusout", () => setTimeout(restoreViewport, 250));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setTimeout(restoreViewport, 120);
});
