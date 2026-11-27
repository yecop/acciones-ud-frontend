import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import styles from "../components/comisionista/comisionista.module.css";
import EstadoCarga from "../components/comisionista/EstadoCarga.jsx";
import { textoDeError } from "../components/comisionista/errores.js";
import {
  actualizarEstrategia,
  crearEstrategia,
  listarEstrategias,
} from "../api/comisionistaApi.js";
import { useCarga } from "../hooks/useCarga.js";

const PERFILES = [
  { valor: "CONSERVADOR", etiqueta: "Conservador" },
  { valor: "MODERADO", etiqueta: "Moderado" },
  { valor: "AGRESIVO", etiqueta: "Agresivo" },
];
const etiquetaPerfil = (v) => PERFILES.find((p) => p.valor === v)?.etiqueta ?? v;
const VACIA = { nombre: "", descripcion: "", perfilRiesgo: "MODERADO" };

/** Administrar estrategias (comisionista): crear, editar y archivar/reactivar. SCRUM-65. */
export default function EstrategiasPage() {
  const cargar = useCallback(({ signal }) => listarEstrategias({ tamano: 50 }, { signal }), []);
  const carga = useCarga(cargar);
  const [formulario, setFormulario] = useState(null); // { id?: string, ...campos }
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const lista = carga.datos?.contenido ?? [];

  const guardar = async (evento) => {
    evento.preventDefault();
    const nombre = formulario.nombre.trim();
    if (nombre.length < 3 || nombre.length > 60) {
      setError("El nombre debe tener entre 3 y 60 caracteres.");
      return;
    }
    setError(null);
    setTrabajando(true);
    try {
      const datos = {
        nombre,
        descripcion: formulario.descripcion.trim(),
        perfilRiesgo: formulario.perfilRiesgo,
      };
      if (formulario.id) await actualizarEstrategia(formulario.id, datos);
      else await crearEstrategia(datos);
      setResultado({
        tipo: "ok",
        texto: formulario.id ? "Estrategia actualizada." : "Estrategia creada.",
      });
      setFormulario(null);
      await carga.refrescar();
    } catch (e) {
      setError(textoDeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  const cambiarEstado = async (e, estado) => {
    setResultado(null);
    try {
      await actualizarEstrategia(e.id, { estado });
      setResultado({
        tipo: "ok",
        texto:
          estado === "ARCHIVADA"
            ? `«${e.nombre}» quedó archivada.`
            : `«${e.nombre}» está activa otra vez.`,
      });
      await carga.refrescar();
    } catch (err) {
      setResultado({ tipo: "error", texto: textoDeError(err) });
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>Estrategias</h1>
          <p className={styles.texto}>
            Plantillas de criterio que puedes asociar a tus propuestas. Una estrategia archivada no
            se puede usar en propuestas nuevas.
          </p>
        </div>
        <div className={styles.accionesFila}>
          <Link className={styles.boton} to="/comisionista">
            Mis clientes
          </Link>
          {!formulario && (
            <button
              type="button"
              className={styles.botonPrimario}
              onClick={() => setFormulario({ ...VACIA })}
            >
              Nueva estrategia
            </button>
          )}
        </div>
      </div>

      {resultado && (
        <p
          className={resultado.tipo === "error" ? styles.error : styles.mensaje}
          role={resultado.tipo === "error" ? "alert" : "status"}
        >
          {resultado.texto}
        </p>
      )}

      {formulario && (
        <form
          className={styles.card}
          onSubmit={guardar}
          noValidate
          aria-label="Formulario de estrategia"
        >
          <h2 className={styles.subtitulo}>
            {formulario.id ? "Editar estrategia" : "Nueva estrategia"}
          </h2>
          <div className={styles.formGrid}>
            <label className={styles.campo}>
              <span>Nombre</span>
              <input
                value={formulario.nombre}
                maxLength={60}
                onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
              />
            </label>
            <label className={styles.campo}>
              <span>Perfil de riesgo</span>
              <select
                value={formulario.perfilRiesgo}
                onChange={(e) => setFormulario({ ...formulario, perfilRiesgo: e.target.value })}
              >
                {PERFILES.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.campo}>
            <span>Descripción</span>
            <textarea
              value={formulario.descripcion}
              maxLength={500}
              onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.accionesFila}>
            <button type="submit" className={styles.botonPrimario} disabled={trabajando}>
              Guardar estrategia
            </button>
            <button
              type="button"
              className={styles.boton}
              onClick={() => {
                setFormulario(null);
                setError(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <EstadoCarga {...carga} onReintentar={carga.recargar} recurso="tus estrategias" />

      {carga.datos && lista.length === 0 && (
        <p className={styles.vacio}>Todavía no has creado estrategias.</p>
      )}

      {lista.length > 0 && (
        <ul className={styles.lista} aria-label="Lista de estrategias">
          {lista.map((e) => (
            <li key={e.id} className={styles.fila}>
              <div className={styles.filaCuerpo}>
                <p className={styles.filaTitulo}>{e.nombre}</p>
                <p className={styles.texto}>
                  Perfil {etiquetaPerfil(e.perfilRiesgo).toLowerCase()}
                  {e.descripcion ? ` · ${e.descripcion}` : ""}
                </p>
              </div>
              <span
                className={`${styles.chip} ${e.estado === "ACTIVA" ? styles.positivo : styles.apagado}`}
              >
                {e.estado === "ACTIVA" ? "Activa" : "Archivada"}
              </span>
              <div className={styles.accionesFila}>
                <button
                  type="button"
                  className={styles.boton}
                  aria-label={`Editar ${e.nombre}`}
                  onClick={() => {
                    setError(null);
                    setFormulario({
                      id: e.id,
                      nombre: e.nombre,
                      descripcion: e.descripcion ?? "",
                      perfilRiesgo: e.perfilRiesgo,
                    });
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className={styles.boton}
                  aria-label={`${e.estado === "ACTIVA" ? "Archivar" : "Reactivar"} ${e.nombre}`}
                  onClick={() => cambiarEstado(e, e.estado === "ACTIVA" ? "ARCHIVADA" : "ACTIVA")}
                >
                  {e.estado === "ACTIVA" ? "Archivar" : "Reactivar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
