import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "bootstrap/dist/css/bootstrap.min.css"
import App from "./App"
import { missingSettings } from "./config"

const root = createRoot(document.getElementById("root")!)

if (missingSettings.length > 0) {
  root.render(
    <div className="container py-5">
      <div className="alert alert-danger">
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
