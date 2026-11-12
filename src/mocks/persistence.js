const CLAVE = "acciones-ud.mock-perfil.v1";

/** Solo modo mock: guarda los datos editables demo y refresh tokens ficticios de la pestaña.
 * Nunca serializa contraseñas, access tokens ni información del backend real.
 */
export function conectarPersistencia(db, storage) {
  try {
    const guardado = JSON.parse(storage.getItem(CLAVE) ?? "null");
    if (guardado && Array.isArray(guardado.perfiles)) {
      for (const p of guardado.perfiles) {
        const usuario = db.usuarios.find((u) => u.id === p.id);
        if (!usuario) continue;
        if (typeof p.nombre === "string") usuario.nombre = p.nombre;
        if (typeof p.celular === "string") usuario.celular = p.celular;
        if (p.preferencias && typeof p.preferencias === "object")
          usuario.preferencias = p.preferencias;
      }
      const refresh = Array.isArray(guardado.refresh) ? guardado.refresh : [];
      db.tokensRefresh = new Map(
        refresh.filter(
          (par) =>
            Array.isArray(par) &&
            typeof par[0] === "string" &&
            db.usuarios.some((u) => u.id === par[1])
        )
      );
    }
  } catch {
    /* almacenamiento bloqueado o corrupto: conserva los datos demo */
  }
  db.persistir = () => {
    try {
      storage.setItem(
        CLAVE,
        JSON.stringify({
          perfiles: db.usuarios.map(({ id, nombre, celular, preferencias }) => ({
            id,
            nombre,
            celular,
            preferencias,
          })),
          refresh: [...db.tokensRefresh],
        })
      );
    } catch {
      /* almacenamiento no disponible: el mock sigue funcionando en memoria */
    }
  };
}
