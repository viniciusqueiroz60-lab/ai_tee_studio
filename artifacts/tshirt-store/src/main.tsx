import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { initFirebase, getIdToken } from "./lib/firebase";

// The generated API client already has /api/ prefixed in every path,
// so we don't set a base URL (it would double up to /api/api/...).
setBaseUrl(null);
setAuthTokenGetter(() => getIdToken());

initFirebase().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch((err) => {
  console.error("Failed to initialize Firebase:", err);
  document.getElementById("root")!.innerHTML =
    '<div style="color:red;padding:2rem">Failed to load app configuration. Please try again.</div>';
});
