import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import OtpInput from "./OtpInput.jsx";

/** Envoltorio con estado, como lo usa el formulario real. */
function Campo(props) {
  const [valor, setValor] = useState(Array(6).fill(""));
  return (
    <>
      <OtpInput length={6} value={valor} onChange={setValor} {...props} />
      <output data-testid="valor">{valor.join("")}</output>
    </>
  );
}

const celda = (n) => screen.getByLabelText(`Dígito ${n}`);

describe("OtpInput", () => {
  it("al escribir un dígito pasa el foco a la celda siguiente", async () => {
    const usuario = userEvent.setup();
    render(<Campo />);

    await usuario.click(celda(1));
    await usuario.keyboard("48");

    expect(screen.getByTestId("valor")).toHaveTextContent("48");
    expect(celda(3)).toHaveFocus();
  });

  it("ignora lo que no sea un dígito", async () => {
    const usuario = userEvent.setup();
    render(<Campo />);

    await usuario.click(celda(1));
    await usuario.keyboard("a-4");

    expect(screen.getByTestId("valor")).toHaveTextContent("4");
  });

  it("Backspace en una celda vacía vuelve a la anterior", async () => {
    const usuario = userEvent.setup();
    render(<Campo />);

    await usuario.click(celda(1));
    await usuario.keyboard("4");
    expect(celda(2)).toHaveFocus();
    await usuario.keyboard("{Backspace}");

    expect(celda(1)).toHaveFocus();
  });

  it("las flechas mueven el foco entre celdas", async () => {
    const usuario = userEvent.setup();
    render(<Campo />);

    await usuario.click(celda(3));
    await usuario.keyboard("{ArrowLeft}");
    expect(celda(2)).toHaveFocus();
    await usuario.keyboard("{ArrowRight}{ArrowRight}");
    expect(celda(4)).toHaveFocus();
  });

  it("pegar el código completo llena todas las celdas, ignorando separadores", () => {
    render(<Campo />);

    fireEvent.paste(celda(1), { clipboardData: { getData: () => "482 913" } });

    expect(screen.getByTestId("valor")).toHaveTextContent("482913");
    expect(celda(6)).toHaveFocus();
  });

  it("pegar más dígitos de los necesarios recorta al largo del código", () => {
    render(<Campo />);

    fireEvent.paste(celda(1), { clipboardData: { getData: () => "123456789" } });

    expect(screen.getByTestId("valor")).toHaveTextContent("123456");
  });

  it("autoFocus enfoca la primera celda y vuelve a hacerlo al cambiar resetKey", () => {
    const { rerender } = render(<Campo autoFocus resetKey={0} />);
    expect(celda(1)).toHaveFocus();

    celda(4).focus();
    rerender(<Campo autoFocus resetKey={1} />);

    expect(celda(1)).toHaveFocus();
  });

  it("deshabilitado no permite escribir", () => {
    render(<Campo disabled />);

    expect(celda(1)).toBeDisabled();
  });

  it("invalid marca las celdas con aria-invalid", () => {
    render(<Campo invalid />);

    expect(celda(1)).toHaveAttribute("aria-invalid", "true");
  });

  it("el primer campo pide autocompletado de código de un solo uso", () => {
    render(<Campo />);

    expect(celda(1)).toHaveAttribute("autocomplete", "one-time-code");
  });
});
