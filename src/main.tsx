import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ActingUserProvider } from "./context/ActingUser";
import { ToastProvider } from "./context/Toast";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ActingUserProvider>
          <App />
        </ActingUserProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
