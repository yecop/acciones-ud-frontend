import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "../components/comisionista/comisionista.module.css";
import EstadoCarga from "../components/comisionista/EstadoCarga.jsx";
import Paginacion from "../components/ui/Paginacion.jsx";
import { listarClientes } from "../api/comisionistaApi.js";
import { useCarga } from "../hooks/useCarga.js";

const TAMANO = 10;

/** Clientes asignados al comisionista (SCRUM-65). */
export default function ClientesPage() {
  const [params, setParams] = useSearchParams();
  const n = Number.parseInt(params.get("pagina") ?? "1", 10);
  const pagina = Number.isInteger(n) && n > 0 ? n : 1;
  const cargar = useCallback(
    ({ signal }) => listarClientes({ pagina: pagina - 1, tamano: TAMANO }, { signal }),
    [pagina]
  );
  const carga = useCarga(cargar);
  const lista = carga.datos?.contenido ?? [];

  return (
    <div className={styles.main}>
      <div className={styles.cabecera}>
        <div>
          <h1 className={styles.heading}>Mis clientes</h1>
          <p className={styles.texto}>
            Solo ves a los inversionistas asignados a tu cuenta, y de ellos su portafolio y sus
            órdenes.
          </p>
        </div>
        <Link className={styles.boton} to="/estrategias">
          Mis estrategias
        </Link>
      </div>

      <EstadoCarga {...carga} onReintentar={carga.recargar} recurso="tus clientes" />

      {carga.datos && lista.length === 0 && (
        <p className={styles.vacio}>Todavía no tienes clientes asignados.</p>
      )}

      {lista.length > 0 && (
        <ul className={styles.lista} aria-label="Lista de clientes">
          {lista.map((c) => (
            <li key={c.id} className={styles.fila}>
              <div className={styles.filaCuerpo}>
                <p className={styles.filaTitulo}>{c.nombre}</p>
                <p className={styles.texto}>
                  {c.correo} · Experiencia {String(c.nivelExperiencia ?? "—").toLowerCase()} ·{" "}
                  {c.operaEnNombre
                    ? "Autorizó operar a su nombre"
                    : "No autorizó operar a su nombre"}
                </p>
                <p className={styles.texto}>
                  {c.propuestasActivas === 0
                    ? "Sin propuestas activas"
                    : `${c.propuestasActivas} ${c.propuestasActivas === 1 ? "propuesta activa" : "propuestas activas"}`}
                </p>
              </div>
              <Link
                className={styles.botonPrimario}
                to={`/comisionista/clientes/${c.id}`}
                aria-label={`Ver cliente ${c.nombre}`}
              >
                Ver cliente
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Paginacion
        pagina={pagina}
        totalPaginas={carga.datos?.totalPaginas ?? 0}
        totalElementos={carga.datos?.totalElementos}
        unidad="clientes"
        onCambiar={(p) => setParams(p > 1 ? { pagina: String(p) } : {})}
      />
    </div>
  );
}
