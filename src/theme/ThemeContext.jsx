import { createContext, useContext, useEffect, useState } from "react";

/**
 * Catálogo de temas disponibles.
 * `id` coincide con el valor del atributo data-theme en themes.css.
 * `swatch` se usa para la vista previa en el selector.
 */
export const THEMES = [
  {
    id: "esmeralda",
    label: "Esmeralda Tradicional",
    swatch: ["#0a192f", "#10b981", "#1e293b", "#f8fafc"],
  },
  {
    id: "neon",
    label: "Verde Neón",
    swatch: ["#121212", "#00e676", "#212121", "#f4f6f8"],
  },
  {
    id: "cobalto",
    label: "Azul Cobalto",
    swatch: ["#2563eb", "#16a34a", "#374151", "#f3f4f6"],
  },
  {
    id: "bosque",
    label: "Verde Bosque",
    swatch: ["#0b4c2c", "#ffffff", "#d1fae5", "#f4f6f8"],
  },
];

const DEFAULT_THEME = "esmeralda";
const STORAGE_KEY = "acciones-ud-theme";

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  themes: THEMES,
  setTheme: () => {},
});

/** Lee el tema guardado o devuelve el por defecto. */
function getInitialTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME;
}

/**
 * Proveedor de tema. Aplica el atributo data-theme en <html> y persiste
 * la selección en localStorage.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themes: THEMES, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook de acceso al tema actual y su setter. */
export function useTheme() {
  return useContext(ThemeContext);
}
