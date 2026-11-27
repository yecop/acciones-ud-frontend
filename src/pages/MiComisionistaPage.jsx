import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import styles from "../components/comisionista/comisionista.module.css";
import EstadoCarga from "../components/comisionista/EstadoCarga.jsx";
import { textoDeError } from "../components/comisionista/errores.js";
import {
  asociarComisionista,
  desasociarComisionista,
  listarComisionistas,
  obtenerPerfil,
} from "../api/perfilApi.js";
import { useCarga } from "../hooks/useCarga.js";

const PERFIL = { CONSERVADOR: "Conservador", MODERADO: "Moderado", AGRESIVO: "Agresivo" };

/** Elegir, cambiar o dejar al comisionista (inversionista). SCRUM-65; endpoints de perfil ya existían. */
export default function MiComisionistaPage() {
  const cargar = useCallback(async ({ signal }) => {
    const [perfil, comisionistas] = await Promise.all([
      obtenerPerfil({ signal }),
      listarComisionistas({ signal }),
    ]);
    return { perfil, comisionistas };
  }, []);
  const carga = useCarga(cargar);
  const [eligiendo, setEligiendo] = useState(false);
  const [operaEnNombre, setOperaEnNombre] = useState(false);
  const [pendiente, setPendiente] = useState(null); // { tipo: "elegir", comisionista } | { tipo: "dejar" }
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const actual = carga.datos?.perfil?.comisionista ?? null;
  const mostrarCatalogo = !actual || eligiendo;

  const confirmar = async () => {
    setTrabajando(true);
    setResultado(null);
    try {
      if (pendiente.tipo === "elegir") {
        await asociarComisionista({
          comisionistaId: pendiente.comisionista.id,
          operaEnNombre,
        });
        setResultado({
          tipo: "ok",
          texto: `Listo, tu comisionista ahora es ${pendiente.comisionista.nombre}`,
        });
      } else {
        await desasociarComisionista();
        setResultado({ tipo: "ok", texto: "Ya no tienes comisionista asociado." });
      }
      setEligiendo(false);
      await carga.refrescar();
    } catch (e) {
      setResultado({ tipo: "error", texto: textoDeError(e) });
    } finally {
      setTrabajando(false);
      setPendiente(null);
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>Mi comisionista</h1>
          <p className={styles.texto}>
            Un comisionista revisa tu perfil, te envía propuestas y, solo si las apruebas, firma las
            órdenes. Solo ve tu portafolio y tus órdenes.
          </p>
        </div>
        <Link className={styles.boton} to="/propuestas">
          Ver mis propuestas
        </Link>
      </div>

      <EstadoCarga {...carga} onReintentar={carga.recargar} recurso="tu perfil" />

      {resultado && (
        <p
          className={resultado.tipo === "error" ? styles.error : styles.mensaje}
          role={resultado.tipo === "error" ? "alert" : "status"}
        >
          {resultado.texto}
        </p>
      )}

      {carga.datos && actual && (
        <section className={styles.card} aria-labelledby="titulo-actual">
          <h2 id="titulo-actual" className={styles.subtitulo}>
            Tu comisionista
          </h2>
          <dl className={styles.datos}>
            <div>
              <dt>Nombre</dt>
              <dd>{actual.nombre}</dd>
            </div>
            <div>
              <dt>Puede operar a tu nombre</dt>
              <dd>{actual.operaEnNombre ? "Sí, con tu aprobación" : "No"}</dd>
            </div>
          </dl>
          {!pendiente && (
            <div className={styles.accionesFila}>
              <button
                type="button"
                className={styles.boton}
                onClick={() => setEligiendo((v) => !v)}
              >
                {eligiendo ? "Cancelar el cambio" : "Cambiar comisionista"}
              </button>
              <button
                type="button"
                className={styles.botonPeligro}
                onClick={() => setPendiente({ tipo: "dejar" })}
              >
                Dejar de tener comisionista
              </button>
            </div>
          )}
        </section>
      )}

      {carga.datos && !actual && (
        <p className={styles.texto}>
          Todavía no tienes comisionista. Puedes elegir uno cuando quieras; operar por tu cuenta
          sigue siendo posible.
        </p>
      )}

      {carga.datos && mostrarCatalogo && (
        <section className={styles.card} aria-labelledby="titulo-catalogo">
          <h2 id="titulo-catalogo" className={styles.subtitulo}>
            {actual ? "Elige otro comisionista" : "Elige un comisionista"}
          </h2>
          <label className={styles.accionesFila}>
            <input
              type="checkbox"
              checked={operaEnNombre}
              onChange={(e) => setOperaEnNombre(e.target.checked)}
            />
            <span>Permitir que opere a mi nombre (siempre con mi aprobación)</span>
          </label>
          <ul className={styles.lista} aria-label="Comisionistas disponibles">
            {carga.datos.comisionistas.map((c) => (
              <li key={c.id} className={styles.fila}>
                <div className={styles.filaCuerpo}>
                  <p className={styles.filaTitulo}>{c.nombre}</p>
                  <p className={styles.texto}>
                    {c.especialidad} · Perfil {PERFIL[c.perfil] ?? c.perfil}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.botonPrimario}
                  aria-label={actual?.id === c.id ? undefined : `Elegir a ${c.nombre}`}
                  disabled={actual?.id === c.id || Boolean(pendiente)}
                  onClick={() => setPendiente({ tipo: "elegir", comisionista: c })}
                >
                  {actual?.id === c.id ? "Es tu comisionista" : "Elegir"}
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.texto}>
            Con comisionista, la comisión de cada operación se reparte 60 % para Acciones UD y 40 %
            para el comisionista; siempre ves el desglose antes de confirmar.
          </p>
        </section>
      )}

      {pendiente && (
        <div
          className={styles.confirmacion}
          role="alertdialog"
          aria-label="Confirmar cambio de comisionista"
        >
          <p>
            {pendiente.tipo === "elegir"
              ? `¿Elegir a ${pendiente.comisionista.nombre} como tu comisionista?`
              : "¿Dejar de tener comisionista?"}
            {actual && <> Las propuestas pendientes de {actual.nombre} ya no podrán firmarse.</>}
          </p>
          <div className={styles.accionesFila}>
            <button
              type="button"
              className={styles.botonPrimario}
              disabled={trabajando}
              onClick={confirmar}
            >
              {pendiente.tipo === "elegir" ? "Sí, elegir" : "Sí, dejarlo"}
            </button>
            <button
              type="button"
              className={styles.boton}
              disabled={trabajando}
              onClick={() => setPendiente(null)}
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
