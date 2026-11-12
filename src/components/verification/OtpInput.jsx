import { useEffect, useRef } from "react";
import styles from "./OtpInput.module.css";

/**
 * Campo de código OTP de N dígitos con navegación por teclado.
 *
 * @param {object} props
 * @param {number} [props.length]    Cantidad de dígitos (por defecto 6).
 * @param {string[]} props.value     Arreglo de dígitos (estado controlado).
 * @param {function} props.onChange  Recibe el nuevo arreglo de dígitos.
 * @param {boolean} [props.autoFocus] Enfoca la primera celda al montar y cada vez que cambia `resetKey`.
 * @param {number} [props.resetKey]   Al cambiar, devuelve el foco a la primera celda (tras un error).
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.invalid]   Marca el campo como inválido para lectores de pantalla.
 */
export default function OtpInput({
  length = 6,
  value,
  onChange,
  autoFocus = false,
  resetKey = 0,
  disabled = false,
  invalid = false,
}) {
  const inputsRef = useRef([]);

  const focusCell = (index) => {
    const el = inputsRef.current[index];
    if (el) el.focus();
  };

  useEffect(() => {
    if (autoFocus && !disabled) inputsRef.current[0]?.focus();
  }, [autoFocus, resetKey, disabled]);

  const handleChange = (index, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < length - 1) focusCell(index + 1);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      focusCell(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) focusCell(index - 1);
    if (event.key === "ArrowRight" && index < length - 1) focusCell(index + 1);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const next = Array.from({ length }, (_, i) => pasted[i] ?? "");
    onChange(next);
    focusCell(Math.min(pasted.length, length - 1));
  };

  return (
    <div className={styles.group} role="group" aria-label="Código de verificación">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          className={`${styles.cell} ${value[index] ? styles.filled : ""}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Dígito ${index + 1}`}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={value[index] ?? ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}
