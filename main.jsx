import { Buffer } from "buffer";
window.Buffer = Buffer;

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App.jsx";

const el = document.getElementById("root");
if (!el) throw new Error("Missing #root element in index.html");

createRoot(el).render(<App />);
