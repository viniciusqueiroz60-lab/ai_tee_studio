import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { initFirebase, getIdToken } from "./lib/firebase";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(`${BASE_URL}/api`);
setAuthTokenGetter(() => getIdToken());

initFirebase().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch((err) => {
  console.error("Failed to initialize Firebase:", err);
  document.getElementById("root")!.innerHTML =
    '<div style="color:red;padding:2rem">Failed to load app configuration. Please try again.</div>';
});
