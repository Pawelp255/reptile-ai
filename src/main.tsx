import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { startWatchTodaySync } from "@/lib/native/watchTodaySync";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    window.setInterval(
      () => {
        void registration.update();
      },
      60 * 60 * 1000,
    );
  },
  onRegisterError(error) {
    console.error("Service worker registration failed", error);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
startWatchTodaySync();
