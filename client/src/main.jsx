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

// iPadOS/iOS standalone: the keyboard shifts the visual viewport and often
// fails to restore it, leaving the layout stuck high with a native-painted
// stripe exposed at the bottom. Restore whenever the situation can have
// changed: keyboard close (viewport resize), focus leaving a field, the app
// returning to foreground. The scrollBy pair forces WebKit to recompute the
// visual-viewport offset; scrollTo alone is treated as a no-op.
function restoreViewport() {
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
  window.scrollBy(0, 1);
  window.scrollBy(0, -1);
  const vv = window.visualViewport;
  if (vv && vv.offsetTop > 0) window.scrollTo(0, Math.max(0, window.scrollY - vv.offsetTop));
}

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
