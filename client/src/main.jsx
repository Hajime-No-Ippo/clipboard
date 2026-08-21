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

// iPadOS/iOS standalone: the keyboard shifts the visual viewport and, on blur,
// sometimes never restores it — the page stays stuck at the focus position.
// When the keyboard closes (viewport height returns to full), nudge the scroll
// position so WebKit recomputes the visual viewport offset.
if ("visualViewport" in window) {
  let keyboardWasOpen = false;
  window.visualViewport.addEventListener("resize", () => {
    const open = window.visualViewport.height < window.innerHeight * 0.8;
    if (keyboardWasOpen && !open) {
      window.scrollBy(0, 1);
      window.scrollBy(0, -1);
    }
    keyboardWasOpen = open;
  });
}
