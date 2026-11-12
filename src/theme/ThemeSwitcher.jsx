import { useEffect, useRef, useState } from "react";
import styles from "./ThemeSwitcher.module.css";
import { useTheme } from "./ThemeContext.jsx";

/** Muestra una fila de muestras de color. */
function Swatch({ colors, className }) {
  return (
    <span className={className} aria-hidden="true">
      {colors.map((color, i) => (
        <span key={i} style={{ background: color }} />
      ))}
    </span>
  );
}

/**
 * Selector de paleta de colores. Despliega las 4 paletas con su vista previa
 * y aplica el tema seleccionado globalmente.
 */
export default function ThemeSwitcher() {
  const { theme, themes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const active = themes.find((t) => t.id === theme) ?? themes[0];

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Swatch colors={active.swatch} className={styles.triggerSwatch} />
        <span className={styles.triggerLabel}>Tema: {active.label}</span>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <p className={styles.menuTitle}>Paleta de colores</p>
          {themes.map((item) => {
            const isActive = item.id === theme;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
              >
                <Swatch colors={item.swatch} className={styles.swatch} />
                <span className={styles.optionLabel}>{item.label}</span>
                {isActive && <span className={styles.check}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
