import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/ThemeContext.jsx";
import "./styles/global.css";

async function arrancar() {
  // `npm start` (modo "mock") levanta el servidor simulado antes de pintar la app.
  // La comparación literal permite que el build de producción elimine el mock.
  if (import.meta.env.VITE_USE_MOCK === "true") {
    const { iniciarMock } = await import("./mocks/browser.js");
    await iniciarMock();
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
}

arrancar();
