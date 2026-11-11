import { conectarPersistencia } from "./persistence.js";

function base() {
  return {
    usuarios: [
      {
        id: "1",
        nombre: "Laura",
        celular: "3001234567",
        contrasena: "NO_SERIALIZAR",
        preferencias: { notificaciones: { canales: ["SMS"] } },
      },
    ],
    tokensRefresh: new Map([["mock-refresh-1", "1"]]),
  };
}

it("restaura cambios y renovación mock después de una recarga sin guardar contraseñas", () => {
  const valores = new Map();
  const storage = { getItem: (k) => valores.get(k), setItem: (k, v) => valores.set(k, v) };
  const primero = base();
  conectarPersistencia(primero, storage);
  primero.usuarios[0].nombre = "Laura Pérez";
  primero.persistir();
  expect([...valores.values()][0]).not.toContain("NO_SERIALIZAR");
  const recargado = base();
  recargado.usuarios[0].preferencias = {};
  recargado.tokensRefresh.clear();
  conectarPersistencia(recargado, storage);
  expect(recargado.usuarios[0]).toMatchObject({
    nombre: "Laura Pérez",
    preferencias: { notificaciones: { canales: ["SMS"] } },
  });
  expect(recargado.tokensRefresh.get("mock-refresh-1")).toBe("1");
});

it("tolera almacenamiento corrupto o bloqueado", () => {
  const db = base();
  conectarPersistencia(db, {
    getItem: () => "{roto",
    setItem: () => {
      throw new Error("bloqueado");
    },
  });
  expect(db.usuarios[0].nombre).toBe("Laura");
  expect(() => db.persistir()).not.toThrow();
});
