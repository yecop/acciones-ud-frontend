import { useEffect, useRef, useState } from "react";
import Card from "../components/layout/Card.jsx";
import * as perfilApi from "../api/perfilApi.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import {
  CANALES,
  completarPreferencias,
  erroresDelServidor,
  TEMAS,
  TIPOS_ORDEN,
  validarDatosBasicos,
  validarPreferencias,
  VISTAS_PORTAFOLIO,
} from "./preferencias.js";
import styles from "./ProfilePage.module.css";

function ErrorCampo({ nombre, errores }) {
  return errores[nombre] ? (
    <p className={styles.fieldError} id={`error-${nombre}`}>
      {errores[nombre]}
    </p>
  ) : null;
}

function enfocar(form, errores) {
  requestAnimationFrame(() => {
    const campo = Array.from(form.current?.elements ?? []).find(
      (e) => errores[e.name] && e.tagName !== "FIELDSET"
    );
    (campo ?? form.current?.querySelector('[role="alert"]'))?.focus();
  });
}

function Resumen({ mensaje, errores }) {
  return mensaje ? (
    <div className={styles.error} role="alert" tabIndex={-1}>
      <strong>{mensaje}</strong>
      {Object.keys(errores).length > 0 && (
        <ul>
          {Object.entries(errores).map(([campo, texto]) => (
            <li key={campo}>{texto}</li>
          ))}
        </ul>
      )}
    </div>
  ) : null;
}

export default function ProfilePage() {
  const { rol, actualizarNombre } = useAuth();
  const { setTheme } = useTheme();
  const esInversionista = rol === "INV";
  const [perfil, setPerfil] = useState(null);
  const [preferencias, setPreferencias] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  const [errorCarga, setErrorCarga] = useState({});
  const [guardando, setGuardando] = useState({});
  const [errores, setErrores] = useState({ perfil: {}, preferencias: {} });
  const [mensajes, setMensajes] = useState({});
  const [exito, setExito] = useState({});
  const formPerfil = useRef(null);
  const formPreferencias = useRef(null);
  const enCurso = useRef({});

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setPerfil(null);
    setPreferencias(null);
    setErrorCarga({});
    Promise.allSettled([
      perfilApi.obtenerPerfil(),
      esInversionista ? perfilApi.obtenerPreferencias() : Promise.resolve(null),
    ]).then(([p, preferencias]) => {
      if (!activo) return;
      const fallos = {};
      if (p.status === "fulfilled") {
        setPerfil(p.value);
        actualizarNombre(p.value.nombre);
      } else fallos.perfil = p.reason.mensajeUsuario ?? "No pudimos cargar tus datos.";
      if (preferencias.status === "fulfilled" && preferencias.value) {
        setPreferencias(completarPreferencias(preferencias.value));
        if (TEMAS[preferencias.value.visualizacion?.tema])
          setTheme(preferencias.value.visualizacion.tema);
      } else if (esInversionista)
        fallos.preferencias =
          preferencias.reason?.mensajeUsuario ?? "No pudimos cargar tus preferencias.";
      setErrorCarga(fallos);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [esInversionista, intento, actualizarNombre, setTheme]);

  function limpiar(seccion) {
    setExito((p) => ({ ...p, [seccion]: "" }));
    setMensajes((p) => ({ ...p, [seccion]: "" }));
    setErrores((p) => ({ ...p, [seccion]: {} }));
  }

  function cambiarPreferencia(grupo, campo, valor) {
    setPreferencias((p) => ({ ...p, [grupo]: { ...p[grupo], [campo]: valor } }));
    limpiar("preferencias");
  }

  async function guardar(event, seccion) {
    event.preventDefault();
    if (enCurso.current[seccion]) return;
    const esPerfil = seccion === "perfil";
    const form = esPerfil ? formPerfil : formPreferencias;
    const validacion = esPerfil ? validarDatosBasicos(perfil) : validarPreferencias(preferencias);
    limpiar(seccion);
    setErrores((p) => ({ ...p, [seccion]: validacion }));
    if (Object.keys(validacion).length) {
      setMensajes((p) => ({ ...p, [seccion]: "Revisa los campos indicados antes de guardar." }));
      enfocar(form, validacion);
      return;
    }
    enCurso.current[seccion] = true;
    setGuardando((p) => ({ ...p, [seccion]: true }));
    try {
      if (esPerfil) {
        const cambios = {
          nombre: perfil.nombre.trim(),
          celular: perfil.celular.replace(/[\s()-]/g, ""),
        };
        const respuesta = await perfilApi.actualizarPerfil(cambios);
        setPerfil((prev) => ({ ...prev, ...cambios, ...respuesta }));
        actualizarNombre(respuesta?.nombre ?? cambios.nombre);
      } else {
        const respuesta = await perfilApi.reemplazarPreferencias(preferencias);
        const actualizado = completarPreferencias(respuesta ?? preferencias);
        setPreferencias(actualizado);
        setTheme(actualizado.visualizacion.tema);
      }
      setExito((p) => ({
        ...p,
        [seccion]: esPerfil ? "Tus datos básicos se guardaron." : "Tus preferencias se guardaron.",
      }));
    } catch (error) {
      const campos = erroresDelServidor(error);
      setErrores((p) => ({ ...p, [seccion]: campos }));
      setMensajes((p) => ({
        ...p,
        [seccion]: error.mensajeUsuario ?? "No pudimos guardar los cambios. Inténtalo de nuevo.",
      }));
      enfocar(form, campos);
    } finally {
      enCurso.current[seccion] = false;
      setGuardando((p) => ({ ...p, [seccion]: false }));
    }
  }

  function atributos(nombre, seccion = "preferencias") {
    return {
      id: nombre,
      name: nombre,
      "aria-invalid": !!errores[seccion][nombre],
      "aria-describedby": errores[seccion][nombre] ? `error-${nombre}` : undefined,
    };
  }

  function selector(grupo, campo, titulo, opciones, extra = {}) {
    const nombre = `${grupo}.${campo}`;
    return (
      <div className={styles.field}>
        <label htmlFor={nombre}>{titulo}</label>
        <select
          {...atributos(nombre)}
          value={preferencias[grupo][campo]}
          onChange={(e) => cambiarPreferencia(grupo, campo, e.target.value)}
          {...extra}
        >
          {Object.entries(opciones).map(([id, texto]) => (
            <option key={id} value={id}>
              {texto}
            </option>
          ))}
          {campo === "tipoOrdenPorDefecto" && (
            <option value="TRAILING_STOP" disabled>
              Trailing stop — no disponible
            </option>
          )}
        </select>
        <ErrorCampo nombre={nombre} errores={errores.preferencias} />
      </div>
    );
  }

  function monto(campo, titulo, disabled = false) {
    const nombre = `operaciones.${campo}`;
    return (
      <div className={styles.field}>
        <label htmlFor={nombre}>{titulo}</label>
        <input
          {...atributos(nombre)}
          type="text"
          inputMode="decimal"
          value={preferencias.operaciones[campo]}
          disabled={disabled}
          onChange={(e) => cambiarPreferencia("operaciones", campo, e.target.value)}
        />
        <ErrorCampo nombre={nombre} errores={errores.preferencias} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Tu cuenta, a tu medida</p>
        <h1>Perfil y preferencias</h1>
        <p>Actualiza tus datos y configura cómo quieres usar Acciones UD.</p>
      </header>
      {cargando ? (
        <p role="status">Cargando tu configuración…</p>
      ) : (
        <>
          {Object.keys(errorCarga).length > 0 && (
            <div className={styles.error} role="alert">
              {Object.entries(errorCarga).map(([clave, texto]) => (
                <p key={clave}>{texto}</p>
              ))}
              <button className={styles.secondary} onClick={() => setIntento((p) => p + 1)}>
                Reintentar carga
              </button>
            </div>
          )}
          {perfil && (
            <Card>
              <form
                ref={formPerfil}
                onSubmit={(e) => guardar(e, "perfil")}
                noValidate
                aria-label="Datos básicos"
                aria-busy={!!guardando.perfil}
              >
                <h2>Datos básicos</h2>
                <Resumen mensaje={mensajes.perfil} errores={errores.perfil} />
                <fieldset disabled={guardando.perfil} className={styles.fields}>
                  <legend className={styles.srOnly}>Información personal</legend>
                  <div className={styles.field}>
                    <label htmlFor="nombre">Nombre completo</label>
                    <input
                      {...atributos("nombre", "perfil")}
                      autoComplete="name"
                      value={perfil.nombre ?? ""}
                      required
                      maxLength={120}
                      onChange={(e) => {
                        setPerfil((p) => ({ ...p, nombre: e.target.value }));
                        limpiar("perfil");
                      }}
                    />
                    <ErrorCampo nombre="nombre" errores={errores.perfil} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="celular">Celular</label>
                    <input
                      {...atributos("celular", "perfil")}
                      autoComplete="tel"
                      type="tel"
                      value={perfil.celular ?? ""}
                      required
                      maxLength={20}
                      onChange={(e) => {
                        setPerfil((p) => ({ ...p, celular: e.target.value }));
                        limpiar("perfil");
                      }}
                    />
                    <ErrorCampo nombre="celular" errores={errores.perfil} />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="correo">Correo electrónico</label>
                    <input
                      id="correo"
                      type="email"
                      autoComplete="email"
                      value={perfil.correo ?? ""}
                      readOnly
                      aria-describedby="ayuda-correo"
                    />
                    <p id="ayuda-correo" className={styles.help}>
                      El correo identifica tu cuenta y no se modifica desde esta pantalla.
                    </p>
                    <ErrorCampo nombre="correo" errores={errores.perfil} />
                  </div>
                  <button className={styles.primary} type="submit">
                    {guardando.perfil ? "Guardando datos…" : "Guardar datos básicos"}
                  </button>
                </fieldset>
                <p role="status" className={styles.success}>
                  {exito.perfil}
                </p>
              </form>
            </Card>
          )}
          {esInversionista && preferencias && (
            <form
              ref={formPreferencias}
              onSubmit={(e) => guardar(e, "preferencias")}
              aria-label="Preferencias"
              noValidate
              aria-busy={!!guardando.preferencias}
            >
              <Resumen mensaje={mensajes.preferencias} errores={errores.preferencias} />
              <fieldset className={styles.formBody} disabled={guardando.preferencias}>
                <legend className={styles.srOnly}>Preferencias de tu cuenta</legend>
                <div className={styles.grid}>
                  <Card>
                    <h2>Notificaciones</h2>
                    <fieldset
                      className={styles.group}
                      aria-describedby={
                        errores.preferencias["notificaciones.canales"]
                          ? "error-notificaciones.canales"
                          : undefined
                      }
                    >
                      <legend>Canales de notificación</legend>
                      <div className={styles.choices}>
                        {Object.entries(CANALES).map(([id, texto]) => (
                          <label key={id} className={styles.choice}>
                            <input
                              type="checkbox"
                              name="notificaciones.canales"
                              value={id}
                              checked={preferencias.notificaciones.canales.includes(id)}
                              aria-invalid={!!errores.preferencias["notificaciones.canales"]}
                              aria-describedby={
                                errores.preferencias["notificaciones.canales"]
                                  ? "error-notificaciones.canales"
                                  : undefined
                              }
                              onChange={() => {
                                const prev = preferencias.notificaciones.canales;
                                cambiarPreferencia(
                                  "notificaciones",
                                  "canales",
                                  prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
                                );
                              }}
                            />
                            {texto}
                          </label>
                        ))}
                      </div>
                      <ErrorCampo nombre="notificaciones.canales" errores={errores.preferencias} />
                    </fieldset>
                    <label className={styles.choice}>
                      <input
                        {...atributos("notificaciones.reporteMensual")}
                        type="checkbox"
                        checked={preferencias.notificaciones.reporteMensual}
                        onChange={(e) =>
                          cambiarPreferencia("notificaciones", "reporteMensual", e.target.checked)
                        }
                      />
                      Recibir reporte mensual por correo
                    </label>
                    <ErrorCampo
                      nombre="notificaciones.reporteMensual"
                      errores={errores.preferencias}
                    />
                  </Card>
                  <Card>
                    <h2>Visualización</h2>
                    <div className={styles.stack}>
                      {selector(
                        "visualizacion",
                        "portafolio",
                        "Vista del portafolio",
                        VISTAS_PORTAFOLIO
                      )}
                      {selector("visualizacion", "tema", "Tema de color", TEMAS)}
                    </div>
                  </Card>
                  <Card>
                    <h2>Operaciones</h2>
                    <div className={styles.stack}>
                      {selector(
                        "operaciones",
                        "tipoOrdenPorDefecto",
                        "Tipo de orden por defecto",
                        TIPOS_ORDEN
                      )}
                      <p className={styles.help}>Trailing stop aún no está disponible.</p>
                      {monto("limiteDiario", "Límite diario (USD)")}
                      <label className={styles.choice}>
                        <input
                          {...atributos("operaciones.confirmarAntesDeEnviar")}
                          type="checkbox"
                          checked={preferencias.operaciones.confirmarAntesDeEnviar ?? true}
                          onChange={(e) =>
                            cambiarPreferencia(
                              "operaciones",
                              "confirmarAntesDeEnviar",
                              e.target.checked
                            )
                          }
                        />
                        Confirmar antes de enviar una orden
                      </label>
                      <ErrorCampo
                        nombre="operaciones.confirmarAntesDeEnviar"
                        errores={errores.preferencias}
                      />
                    </div>
                  </Card>
                  <Card>
                    <h2>Seguridad de las órdenes</h2>
                    <div className={styles.stack}>
                      <label className={styles.choice}>
                        <input
                          {...atributos("operaciones.dobleAutorizacion")}
                          type="checkbox"
                          checked={preferencias.operaciones.dobleAutorizacion}
                          onChange={(e) =>
                            cambiarPreferencia("operaciones", "dobleAutorizacion", e.target.checked)
                          }
                        />
                        Solicitar doble autorización para órdenes grandes
                      </label>
                      <ErrorCampo
                        nombre="operaciones.dobleAutorizacion"
                        errores={errores.preferencias}
                      />
                      {monto(
                        "umbralOrdenGrande",
                        "Umbral de orden grande (USD)",
                        !preferencias.operaciones.dobleAutorizacion
                      )}
                      <p className={styles.help}>
                        Cuando actives la doble autorización, define el monto a partir del cual se
                        requiere una verificación adicional.
                      </p>
                    </div>
                  </Card>
                </div>
                <div className={styles.actions}>
                  <button type="submit" className={styles.primary}>
                    {guardando.preferencias ? "Guardando preferencias…" : "Guardar preferencias"}
                  </button>
                </div>
              </fieldset>
              <p role="status" className={styles.success}>
                {exito.preferencias}
              </p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
