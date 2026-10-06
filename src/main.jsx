import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const savedTheme = localStorage.getItem("theme");
const theme = savedTheme === "light" ? "light" : "dark";

const html = document.documentElement;
const body = document.body;

html.classList.remove("light", "dark");
html.classList.add(theme);
html.dataset.theme = theme;
html.style.colorScheme = theme;

body.classList.remove("light", "dark");
body.classList.add(theme);
body.dataset.theme = theme;

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
