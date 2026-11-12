import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Logo from "./Logo.jsx";

describe("Logo", () => {
  it("expone el nombre de la marca como texto alternativo", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "Acciones UD" })).toBeInTheDocument();
  });

  it("calcula el ancho según el alto y la variante", () => {
    render(<Logo variante="isotipo" alto={40} />);
    const img = screen.getByRole("img", { name: "Acciones UD" });
    expect(img).toHaveAttribute("height", "40");
    expect(img).toHaveAttribute("width", "35");
  });
});
