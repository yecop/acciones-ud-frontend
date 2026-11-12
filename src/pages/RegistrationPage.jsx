import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header.jsx";
import Card from "../components/layout/Card.jsx";
import { registrar } from "../api/authApi.js";
import { investmentProfileData } from "../data/investmentProfileData.js";
import { cuerpoRegistro, NIVELES, OBJETIVOS, RIESGOS, validarRegistro } from "./registration.js";
import styles from "./RegistrationPage.module.css";

const MERCADOS = Object.fromEntries(
  investmentProfileData.markets.map(({ id, label }) => [
    id === "lse" ? "LSE" : id.toUpperCase(),
    label,
  ])
);
const SECTORES = {
  TECNOLOGIA: "Tecnología",
  SALUD: "Salud",
  CONSUMO: "Consumo",
  ENERGIA: "Energía",
  FINANZAS: "Finanzas",
};
const inicial = {
  nombre: "",
  correo: "",
  celular: "",
  contrasena: "",
  confirmacion: "",
  nivelExperiencia: "",
  perfilRiesgo: "",
  intereses: { mercados: [], sectores: [] },
  objetivos: [],
};

function MensajeCampo({ campo, errores }) {
  return errores[campo] ? (
    <p id={`error-${campo}`} className={styles.fieldError}>
      {errores[campo]}
    </p>
  ) : null;
}

/** Controles nativos: selección por teclado y etiquetas completas sin roles simulados. */
function Opciones({ campo, titulo, opciones, valor, multiple = false, cambiar, errores }) {
  return (
    <fieldset
      className={styles.group}
      aria-describedby={errores[campo] ? `error-${campo}` : undefined}
      aria-invalid={!!errores[campo]}
    >
      <legend>{titulo}</legend>
      <div className={styles.options}>
        {Object.entries(opciones).map(([id, etiqueta]) => (
          <label className={styles.option} key={id}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={campo}
              value={id}
              checked={multiple ? valor.includes(id) : valor === id}
              onChange={() => cambiar(id)}
              aria-describedby={errores[campo] ? `error-${campo}` : undefined}
              aria-invalid={!!errores[campo]}
            />
            <span>{etiqueta}</span>
          </label>
        ))}
      </div>
      <MensajeCampo campo={campo} errores={errores} />
    </fieldset>
  );
}

export default function RegistrationPage() {
  const [datos, setDatos] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const form = useRef(null);
  const resumen = useRef(null);
  const exito = useRef(null);
  const enCurso = useRef(false);

  useEffect(() => {
    if (resultado) exito.current?.focus();
  }, [resultado]);

  function cambiar(campo, valor) {
    setDatos((prev) => {
      if (campo.startsWith("intereses.")) {
        return { ...prev, intereses: { ...prev.intereses, [campo.split(".")[1]]: valor } };
      }
      return { ...prev, [campo]: valor };
    });
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setError("");
  }

  function enfocarErrores(campos) {
    requestAnimationFrame(() => {
      const campo = Array.from(form.current?.elements ?? []).find(
        (elemento) => campos[elemento.name] && elemento.type !== "fieldset"
      );
      (campo ?? resumen.current)?.focus();
    });
  }

  async function enviar(event) {
    event.preventDefault();
    if (enCurso.current) return;
    const validacion = validarRegistro(datos);
    setErrores(validacion);
    setError("");
    if (Object.keys(validacion).length) {
      setError("Revisa los campos indicados antes de crear tu cuenta.");
      enfocarErrores(validacion);
      return;
    }
    enCurso.current = true;
    setEnviando(true);
    try {
      const respuesta = await registrar(cuerpoRegistro(datos));
      setResultado(respuesta ?? {});
      setDatos(inicial);
    } catch (e) {
      const campos = {};
      if (e.codigo === "VALIDACION_FALLIDA" && Array.isArray(e.detalles)) {
        e.detalles.forEach(({ campo, problema }) => {
          if (campo && problema) campos[campo] = problema;
        });
      }
      if (e.codigo === "CORREO_DUPLICADO")
        campos.correo = "Ya existe una cuenta con este correo. Puedes ingresar o usar otro correo.";
      setErrores(campos);
      setError(e.mensajeUsuario ?? "No pudimos crear tu cuenta. Inténtalo de nuevo.");
      enfocarErrores(campos);
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }

  function campo(nombre, etiqueta, tipo = "text", extra = {}) {
    const ayuda = nombre === "contrasena" ? "ayuda-contrasena" : undefined;
    return (
      <div className={styles.field}>
        <label htmlFor={`registro-${nombre}`}>{etiqueta}</label>
        <input
          id={`registro-${nombre}`}
          name={nombre}
          type={tipo}
          value={datos[nombre]}
          onChange={(event) => cambiar(nombre, event.target.value)}
          required
          aria-invalid={!!errores[nombre]}
          aria-describedby={
            [ayuda, errores[nombre] ? `error-${nombre}` : null].filter(Boolean).join(" ") ||
            undefined
          }
          {...extra}
        />
        {ayuda && (
          <p id={ayuda} className={styles.help}>
            Usa al menos 8 caracteres.
          </p>
        )}
        <MensajeCampo campo={nombre} errores={errores} />
      </div>
    );
  }

  const toggle = (lista, id) =>
    lista.includes(id) ? lista.filter((item) => item !== id) : [...lista, id];
  const pendiente = String(resultado?.estado ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "_");

  return (
    <div className={styles.page}>
      <Header loginHref="#/ingreso" />
      <main className={styles.main}>
        {resultado ? (
          <Card>
            <div className={styles.success}>
              <p className={styles.eyebrow}>Registro recibido</p>
              <h1 ref={exito} tabIndex={-1}>
                {["PENDIENTE_ALTA", "PENDIENTE_DE_ALTA", "PENDIENTE"].includes(pendiente)
                  ? "Tu cuenta está pendiente de alta"
                  : "Tu registro se completó"}
              </h1>
              <p>
                {["PENDIENTE_ALTA", "PENDIENTE_DE_ALTA", "PENDIENTE"].includes(pendiente)
                  ? "Recibimos tus datos. Tu cuenta aún no está habilitada para ingresar ni operar. Debes esperar la confirmación de alta antes de iniciar sesión."
                  : "Ya puedes continuar al ingreso. Si tu cuenta requiere aprobación, espera la confirmación de alta."}
              </p>
              <Link className={styles.primary} to="/ingreso">
                Ir al ingreso
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <div>
              <p className={styles.eyebrow}>Comienza en Acciones UD</p>
              <h1 className={styles.title}>Crea tu cuenta de inversión</h1>
              <p>Cuéntanos sobre ti y cómo quieres invertir. Todos los grupos son obligatorios.</p>
            </div>
            <form ref={form} noValidate onSubmit={enviar} aria-busy={enviando}>
              {error && (
                <div ref={resumen} tabIndex={-1} role="alert" className={styles.error}>
                  <strong>{error}</strong>
                  {Object.entries(errores).filter(([, mensaje]) => mensaje).length > 0 && (
                    <ul>
                      {Object.entries(errores)
                        .filter(([, mensaje]) => mensaje)
                        .map(([nombre, mensaje]) => (
                          <li key={nombre}>{mensaje}</li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
              <fieldset disabled={enviando} className={styles.formBody}>
                <legend className={styles.srOnly}>Datos para el registro</legend>
                <div className={styles.layout}>
                  <div className={styles.stack}>
                    <Card>
                      <h2>Datos personales</h2>
                      <div className={styles.fields}>
                        {campo("nombre", "Nombre completo", "text", {
                          autoComplete: "name",
                          maxLength: 120,
                        })}
                        {campo("correo", "Correo electrónico", "email", {
                          autoComplete: "email",
                          maxLength: 254,
                        })}
                        {campo("celular", "Celular", "tel", {
                          autoComplete: "tel",
                          inputMode: "tel",
                          maxLength: 20,
                        })}
                        {campo("contrasena", "Contraseña", "password", {
                          autoComplete: "new-password",
                          minLength: 8,
                        })}
                        {campo("confirmacion", "Confirmar contraseña", "password", {
                          autoComplete: "new-password",
                        })}
                      </div>
                    </Card>
                    <Card>
                      <Opciones
                        campo="nivelExperiencia"
                        titulo="Tu nivel de experiencia"
                        opciones={NIVELES}
                        valor={datos.nivelExperiencia}
                        cambiar={(valor) => cambiar("nivelExperiencia", valor)}
                        errores={errores}
                      />
                      <Opciones
                        campo="intereses.mercados"
                        titulo="Mercados de interés"
                        opciones={MERCADOS}
                        valor={datos.intereses.mercados}
                        multiple
                        cambiar={(id) =>
                          cambiar("intereses.mercados", toggle(datos.intereses.mercados, id))
                        }
                        errores={errores}
                      />
                      <Opciones
                        campo="intereses.sectores"
                        titulo="Sectores de interés"
                        opciones={SECTORES}
                        valor={datos.intereses.sectores}
                        multiple
                        cambiar={(id) =>
                          cambiar("intereses.sectores", toggle(datos.intereses.sectores, id))
                        }
                        errores={errores}
                      />
                    </Card>
                  </div>
                  <div className={styles.stack}>
                    <Card>
                      <Opciones
                        campo="perfilRiesgo"
                        titulo="Tu perfil de riesgo"
                        opciones={RIESGOS}
                        valor={datos.perfilRiesgo}
                        cambiar={(valor) => cambiar("perfilRiesgo", valor)}
                        errores={errores}
                      />
                      <p className={styles.help}>
                        Selecciona el nivel de riesgo con el que te sientes cómodo al invertir.
                      </p>
                      <Opciones
                        campo="objetivos"
                        titulo="Tus objetivos"
                        opciones={OBJETIVOS}
                        valor={datos.objetivos}
                        multiple
                        cambiar={(id) => cambiar("objetivos", toggle(datos.objetivos, id))}
                        errores={errores}
                      />
                    </Card>
                    <Card>
                      <h2>Antes de continuar</h2>
                      <p>
                        El registro no inicia una sesión ni habilita operaciones. Te indicaremos si
                        tu cuenta queda pendiente de alta.
                      </p>
                      <button className={styles.primary} type="submit">
                        {enviando ? "Creando cuenta…" : "Crear cuenta y continuar"}
                      </button>
                      <Link className={styles.back} to="/ingreso">
                        Volver al ingreso
                      </Link>
                    </Card>
                  </div>
                </div>
              </fieldset>
              <p role="status" className={styles.help}>
                {enviando ? "Enviando tus datos. Espera un momento." : ""}
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
