import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCuentaRegresiva } from "./useCuentaRegresiva.js";

describe("useCuentaRegresiva", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sin instante de fin devuelve 0", () => {
    const { result } = renderHook(() => useCuentaRegresiva(null));
    expect(result.current).toBe(0);
  });

  it("cuenta hacia atrás cada segundo y se detiene en 0", () => {
    const fin = Date.now() + 3000;
    const { result } = renderHook(() => useCuentaRegresiva(fin));
    expect(result.current).toBe(3);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(2);

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toBe(0);

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
  });

  it("un instante ya pasado devuelve 0 de entrada", () => {
    const { result } = renderHook(() => useCuentaRegresiva(Date.now() - 1000));
    expect(result.current).toBe(0);
  });

  it("sigue siendo exacta si el navegador congeló los temporizadores (pestaña en segundo plano)", () => {
    const fin = Date.now() + 30_000;
    const { result } = renderHook(() => useCuentaRegresiva(fin));

    // Pasan 20 s de reloj pero solo se dispara un tick.
    vi.setSystemTime(Date.now() + 20_000);
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current).toBe(9);
  });

  it("se reinicia al cambiar el instante de fin", () => {
    let fin = Date.now() + 5000;
    const { result, rerender } = renderHook(() => useCuentaRegresiva(fin));
    expect(result.current).toBe(5);

    fin = Date.now() + 30_000;
    rerender();

    expect(result.current).toBe(30);
  });

  it("limpia el temporizador al desmontar", () => {
    const { unmount } = renderHook(() => useCuentaRegresiva(Date.now() + 5000));
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
