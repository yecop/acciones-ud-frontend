import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styles from "../components/comisionista/comisionista.module.css";
import EstadoCarga from "../components/comisionista/EstadoCarga.jsx";
import { textoDeError } from "../components/comisionista/errores.js";
import { listarClientes, listarEstrategias } from "../api/comisionistaApi.js";
import { crearPropuesta } from "../api/propuestasApi.js";
import { useCarga } from "../hooks/useCarga.js";

const MAX_ORDENES = 10;
const VIGENCIAS = [1, 2, 3, 7, 14, 30];
const TIPOS = [
  { valor: "MARKET", etiqueta: "A mercado" },
  { valor: "LIMIT", etiqueta: "Límite" },
  { valor: "STOP_LOSS", etiqueta: "Stop Loss" },
  { valor: "TAKE_PROFIT", etiqueta: "Take Profit" },
];
const ETIQUETA_PRECIO = {
  LIMIT: "Precio límite",
  STOP_LOSS: "Precio stop",
  TAKE_PROFIT: "Precio objetivo",
};

const ordenVacia = () => ({
  clave: Math.random().toString(36).slice(2),
  ticker: "",
  lado: "COMPRA",
  tipo: "MARKET",
  cantidad: "",
  precio: "",
});

/** Valida el formulario en el cliente; el backend vuelve a validar. Devuelve una lista de textos. */
export function validarFormulario({ clienteId, titulo, ordenes }) {
  const problemas = [];
  if (!clienteId) problemas.push("Elige el cliente.");
  if (titulo.trim().length < 3 || titulo.trim().length > 80)
    problemas.push("El título debe tener entre 3 y 80 caracteres.");
  ordenes.forEach((o, i) => {
    const n = `Orden ${i + 1}`;
    if (!/^[A-Za-z.]{1,6}$/.test(o.ticker.trim()))
      problemas.push(`${n}: escribe un ticker válido (p. ej. AAPL).`);
    const cantidad = Number(o.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1)
      problemas.push(`${n}: la cantidad debe ser un entero de 1 en adelante.`);
    if (o.tipo !== "MARKET" && !(Number(o.precio) > 0))
      problemas.push(`${n}: indica el ${ETIQUETA_PRECIO[o.tipo].toLowerCase()}.`);
  });
  return problemas;
}

/** Crear una propuesta para un cliente asignado (comisionista). SCRUM-65. */
export default function NuevaPropuestaPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cargar = useCallback(async ({ signal }) => {
    const [clientes, estrategias] = await Promise.all([
      listarClientes({ tamano: 50 }, { signal }),
      listarEstrategias({ estado: "ACTIVA", tamano: 50 }, { signal }),
    ]);
    return { clientes: clientes.contenido, estrategias: estrategias.contenido };
  }, []);
  const carga = useCarga(cargar);

  const [clienteId, setClienteId] = useState(params.get("clienteId") ?? "");
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [estrategiaId, setEstrategiaId] = useState("");
  const [dias, setDias] = useState(3);
  const [ordenes, setOrdenes] = useState([ordenVacia()]);
  const [problemas, setProblemas] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const cambiarOrden = (clave, cambios) =>
    setOrdenes((lista) => lista.map((o) => (o.clave === clave ? { ...o, ...cambios } : o)));

  const enviar = async (evento) => {
    evento.preventDefault();
    const lista = validarFormulario({ clienteId, titulo, ordenes });
    setProblemas(lista);
    if (lista.length) return;
    setEnviando(true);
    try {
      const creada = await crearPropuesta({
        clienteId,
        titulo: titulo.trim(),
        ...(nota.trim() ? { nota: nota.trim() } : {}),
        ...(estrategiaId ? { estrategiaId } : {}),
        venceEn: new Date(Date.now() + dias * 86_400_000).toISOString(),
        ordenes: ordenes.map((o) => ({
          ticker: o.ticker.trim().toUpperCase(),
          lado: o.lado,
          tipo: o.tipo,
          cantidad: Number(o.cantidad),
          ...(o.tipo === "LIMIT" ? { precioLimite: Number(o.precio) } : {}),
          ...(o.tipo === "STOP_LOSS" || o.tipo === "TAKE_PROFIT"
            ? { precioStop: Number(o.precio) }
            : {}),
        })),
      });
      navigate(`/propuestas/${creada.id}`);
    } catch (e) {
      const detalles = e?.detalles?.map((d) => `${d.campo}: ${d.problema}`) ?? [];
      setProblemas([textoDeError(e, "el cliente"), ...detalles]);
      setEnviando(false);
    }
  };

  return (
    <div className={styles.main}>
      <Link className={styles.volver} to="/propuestas">
        ← Volver a propuestas
      </Link>
      <h1 className={styles.heading}>Nueva propuesta</h1>
      <p className={styles.texto}>
        El cliente la revisa y decide. Solo cuando la aprueba puedes firmarla y se crean sus
        órdenes.
      </p>

      <EstadoCarga {...carga} onReintentar={carga.recargar} recurso="tus clientes" />

      {carga.datos && carga.datos.clientes.length === 0 && (
        <p className={styles.vacio}>
          Todavía no tienes clientes asignados para enviarles propuestas.
        </p>
      )}

      {carga.datos && carga.datos.clientes.length > 0 && (
        <form className={styles.card} onSubmit={enviar} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.campo}>
              <span>Cliente</span>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Elige un cliente</option>
                {carga.datos.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.campo}>
              <span>Título</span>
              <input value={titulo} maxLength={80} onChange={(e) => setTitulo(e.target.value)} />
            </label>
            <label className={styles.campo}>
              <span>Estrategia (opcional)</span>
              <select value={estrategiaId} onChange={(e) => setEstrategiaId(e.target.value)}>
                <option value="">Sin estrategia</option>
                {carga.datos.estrategias.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.campo}>
              <span>Vigencia</span>
              <select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                {VIGENCIAS.map((d) => (
                  <option key={d} value={d}>
                    {d === 1 ? "1 día" : `${d} días`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.campo}>
            <span>Nota para el cliente (opcional)</span>
            <textarea value={nota} maxLength={500} onChange={(e) => setNota(e.target.value)} />
          </label>

          <h2 className={styles.subtitulo}>Órdenes</h2>
          {ordenes.map((o, i) => (
            <fieldset key={o.clave} className={styles.card} aria-label={`Orden ${i + 1}`}>
              <div className={styles.formGrid}>
                <label className={styles.campo}>
                  <span>Acción (ticker)</span>
                  <input
                    value={o.ticker}
                    maxLength={6}
                    aria-label={`Ticker de la orden ${i + 1}`}
                    onChange={(e) =>
                      cambiarOrden(o.clave, { ticker: e.target.value.toUpperCase() })
                    }
                  />
                </label>
                <label className={styles.campo}>
                  <span>Operación</span>
                  <select
                    value={o.lado}
                    aria-label={`Operación de la orden ${i + 1}`}
                    onChange={(e) => cambiarOrden(o.clave, { lado: e.target.value })}
                  >
                    <option value="COMPRA">Compra</option>
                    <option value="VENTA">Venta</option>
                  </select>
                </label>
                <label className={styles.campo}>
                  <span>Tipo</span>
                  <select
                    value={o.tipo}
                    aria-label={`Tipo de la orden ${i + 1}`}
                    onChange={(e) => cambiarOrden(o.clave, { tipo: e.target.value, precio: "" })}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.campo}>
                  <span>Cantidad</span>
                  <input
                    inputMode="numeric"
                    value={o.cantidad}
                    aria-label={`Cantidad de la orden ${i + 1}`}
                    onChange={(e) => cambiarOrden(o.clave, { cantidad: e.target.value })}
                  />
                </label>
                {o.tipo !== "MARKET" && (
                  <label className={styles.campo}>
                    <span>{ETIQUETA_PRECIO[o.tipo]}</span>
                    <input
                      inputMode="decimal"
                      value={o.precio}
                      aria-label={`${ETIQUETA_PRECIO[o.tipo]} de la orden ${i + 1}`}
                      onChange={(e) => cambiarOrden(o.clave, { precio: e.target.value })}
                    />
                  </label>
                )}
              </div>
              {ordenes.length > 1 && (
                <button
                  type="button"
                  className={styles.enlaceBoton}
                  onClick={() => setOrdenes((l) => l.filter((x) => x.clave !== o.clave))}
                >
                  {`Quitar orden ${i + 1}`}
                </button>
              )}
            </fieldset>
          ))}
          <div className={styles.accionesFila}>
            <button
              type="button"
              className={styles.boton}
              disabled={ordenes.length >= MAX_ORDENES}
              onClick={() => setOrdenes((l) => [...l, ordenVacia()])}
            >
              Agregar otra orden
            </button>
          </div>

          {problemas.length > 0 && (
            <div className={styles.error} role="alert">
              <ul>
                {problemas.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.accionesFila}>
            <button type="submit" className={styles.botonPrimario} disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar propuesta"}
            </button>
            <Link className={styles.boton} to="/propuestas">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
