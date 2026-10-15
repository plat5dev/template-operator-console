import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/inter/opsz.css"
import "@fontsource-variable/jetbrains-mono"
import "./styles/tokens.css"
import "./styles/ui.css"
import App from "./App"
import { missingSettings } from "./config"

const root = createRoot(document.getElementById("root")!)

if (missingSettings.length > 0) {
  root.render(
    <div className="center">
      <div className="alert alert-error" style={{ maxWidth: "40rem" }}>
        Missing settings: {missingSettings.join(", ")}. Set them on the container, or as VITE_* at build
        time. See .env.example.
      </div>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
