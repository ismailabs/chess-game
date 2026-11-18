import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for offline app shell and Stockfish WASM bot games
if (typeof window !== "undefined" && "serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.onupdatefound = () => {
          const installing = reg.installing;
          if (installing) {
            installing.onstatechange = () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                // New update available
                console.info("Chess: App update available. Reload to refresh.");
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn("ServiceWorker registration error:", err);
      });
  });
}
