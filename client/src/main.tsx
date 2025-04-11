import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize application by rendering the App component in the root element
createRoot(document.getElementById("root")!).render(<App />);
