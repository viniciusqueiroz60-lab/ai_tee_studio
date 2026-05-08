import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getIdToken } from "./lib/firebase";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(`${BASE_URL}/api`);
setAuthTokenGetter(() => getIdToken());

createRoot(document.getElementById("root")!).render(<App />);
