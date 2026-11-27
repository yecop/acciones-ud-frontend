import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarVisibilidad, restaurarVisibilidad } from "../test/visibilidad.js";
import { useSondeoVisible } from "./useSondeoVisible.js";

describe("useSondeoVisible", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    restaurarVisibilidad();
    vi.useRealTimers();
  });

  it("con la pestaña visible ejecuta el tick en cada intervalo", () => {
    const tick = vi.fn();
    renderHook(() => useSondeoVisible(tick, 1000));
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it("con la pestaña oculta no consulta y al volver refresca una vez y reanuda", () => {
    const tick = vi.fn();
    renderHook(() => useSondeoVisible(tick, 1000));

    act(() => cambiarVisibilidad("hidden"));
    vi.advanceTimersByTime(10_000);
    expect(tick).not.toHaveBeenCalled();

    act(() => cambiarVisibilidad("visible"));
    expect(tick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it("si arranca con la pestaña oculta no consulta hasta que vuelve", () => {
    cambiarVisibilidad("hidden");
    const tick = vi.fn();
    renderHook(() => useSondeoVisible(tick, 1000));
    vi.advanceTimersByTime(5000);
    expect(tick).not.toHaveBeenCalled();
    act(() => cambiarVisibilidad("visible"));
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it("sin intervalo o inactivo no sondea y al desmontar deja de escuchar", () => {
    const tick = vi.fn();
    renderHook(() => useSondeoVisible(tick, 0));
    renderHook(() => useSondeoVisible(tick, 1000, false));
    const { unmount } = renderHook(() => useSondeoVisible(tick, 1000));
    unmount();
    vi.advanceTimersByTime(5000);
    act(() => cambiarVisibilidad("visible"));
    expect(tick).not.toHaveBeenCalled();
  });
});
