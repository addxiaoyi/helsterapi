import { useEffect } from "react";

const SETTINGS_KEY = "zzznew:user-settings-v1";

export function toggleTheme() {
  let current = "paper";
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) current = (JSON.parse(raw) as { palette?: string }).palette || "paper";
    const palettes = ["paper", "mist", "sage"];
    const next = palettes[(palettes.indexOf(current) + 1) % palettes.length];
    const settings = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, palette: next, theme: "light" }));
    window.dispatchEvent(new Event("zzznew:theme-change"));
  } catch {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  }
}

function applyTheme() {
  let palette: unknown = "paper";
  let font: unknown = "manrope";
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const settings = JSON.parse(raw) as { palette?: unknown; font?: unknown };
      palette = settings.palette;
      font = settings.font;
    }
  } catch {
    selected = "light";
  }
  document.documentElement.dataset.theme = "light";
  document.documentElement.dataset.palette = palette === "mist" || palette === "sage" ? palette : "paper";
  document.documentElement.dataset.font = font === "serif" || font === "mono" ? font : "manrope";
}

export default function ThemeRuntime() {
  useEffect(() => {
    applyTheme();
    const onThemeChange = () => applyTheme();
    window.addEventListener("zzznew:theme-change", onThemeChange);
    return () => {
      window.removeEventListener("zzznew:theme-change", onThemeChange);
    };
  }, []);

  return null;
}
