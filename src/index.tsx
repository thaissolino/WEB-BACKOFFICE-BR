import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "./index.css";

const metaTag = document.createElement("meta");
metaTag.httpEquiv = "X-XSS-Protection";
metaTag.content = "1; mode=block";
document.head.appendChild(metaTag);

const rootElement = document.getElementById("root");

if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<LocalizationProvider dateAdapter={AdapterDayjs}>
					<App />
			</LocalizationProvider>
		</React.StrictMode>,
	);
} else {
	console.error("Elemento raiz 'root' não encontrado.");
}
