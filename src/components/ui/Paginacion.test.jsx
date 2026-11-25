import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Paginacion from "./Paginacion.jsx";

describe("Paginacion", () => {
  it("muestra la página actual y navega", async () => {
    const onCambiar = vi.fn();
    render(<Paginacion pagina={2} totalPaginas={3} totalElementos={25} onCambiar={onCambiar} />);
    expect(screen.getByText(/página 2 de 3 · 25 resultados/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onCambiar).toHaveBeenNthCalledWith(1, 1);
    expect(onCambiar).toHaveBeenNthCalledWith(2, 3);
  });

  it("deshabilita los extremos y no se muestra sin páginas", () => {
    const { rerender } = render(<Paginacion pagina={1} totalPaginas={1} onCambiar={() => {}} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    rerender(<Paginacion pagina={1} totalPaginas={0} onCambiar={() => {}} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
