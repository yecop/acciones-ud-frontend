// Valores consistentes con el perfil existente; confirmar las extensiones con el backend.
export const NIVELES = { PRINCIPIANTE: "Principiante", EXPERIMENTADO: "Experimentado" };
export const RIESGOS = { CONSERVADOR: "Conservador", MODERADO: "Moderado", AGRESIVO: "Agresivo" };
export const OBJETIVOS = {
  AHORRO: "Ahorrar a largo plazo",
  CRECIMIENTO: "Hacer crecer mi capital",
  INGRESOS: "Generar ingresos",
};

export function validarRegistro(datos) {
  const errores = {};
  if (!datos.nombre.trim()) errores.nombre = "Ingresa tu nombre completo.";
  if (!/^\S+@\S+\.\S+$/.test(datos.correo.trim()))
    errores.correo = "Ingresa un correo electrónico válido.";
  if (
    !/^\+?[\d\s()-]{7,20}$/.test(datos.celular.trim()) ||
    datos.celular.replace(/\D/g, "").length < 7
  )
    errores.celular = "Ingresa un celular válido (7 a 15 dígitos).";
  if (datos.celular.replace(/\D/g, "").length > 15)
    errores.celular = "Ingresa un celular válido (7 a 15 dígitos).";
  if (datos.contrasena.length < 8) errores.contrasena = "Usa al menos 8 caracteres.";
  if (!datos.confirmacion || datos.confirmacion !== datos.contrasena)
    errores.confirmacion = "Las contraseñas deben coincidir.";
  if (!NIVELES[datos.nivelExperiencia])
    errores.nivelExperiencia = "Selecciona tu nivel de experiencia.";
  if (!RIESGOS[datos.perfilRiesgo]) errores.perfilRiesgo = "Selecciona un perfil de riesgo.";
  if (!datos.intereses.mercados.length)
    errores["intereses.mercados"] = "Selecciona al menos un mercado.";
  if (!datos.intereses.sectores.length)
    errores["intereses.sectores"] = "Selecciona al menos un sector.";
  if (!datos.objetivos.length) errores.objetivos = "Selecciona al menos un objetivo.";
  return errores;
}

/** Único adaptador del formulario al cuerpo de POST /auth/registro. */
export function cuerpoRegistro({ confirmacion: _confirmacion, ...datos }) {
  return {
    ...datos,
    nombre: datos.nombre.trim(),
    correo: datos.correo.trim().toLowerCase(),
    celular: datos.celular.replace(/[\s()-]/g, ""),
  };
}
