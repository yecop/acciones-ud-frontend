/**
 * Datos por defecto del formulario de perfil de inversión.
 *
 * En producción estos catálogos llegan desde el API Gateway vía REST/JSON.
 * Se exportan con la misma forma que consumirán los componentes, de modo
 * que la respuesta del backend puede reemplazar este objeto directamente.
 *
 * Ejemplo de consumo:
 *   const res = await fetch("/api/onboarding/investment-profile");
 *   const data = await res.json(); // misma forma que `investmentProfileData`
 */
export const investmentProfileData = {
  steps: [
    { id: 1, label: "Datos personales" },
    { id: 2, label: "Perfil de inversión" },
    { id: 3, label: "Cuenta de custodia" },
    { id: 4, label: "Plan" },
  ],
  currentStep: 2,

  experienceLevels: [
    {
      id: "beginner",
      title: "Principiante",
      description: "Quiero aprender y recibir guía antes de operar.",
    },
    {
      id: "experienced",
      title: "Experimentado",
      description: "Ya opero en bolsa y decido por mi cuenta.",
    },
  ],

  markets: [
    { id: "nyse", label: "NYSE" },
    { id: "nasdaq", label: "NASDAQ" },
    { id: "lse", label: "Londres (LSE)" },
    { id: "tse", label: "Tokio (TSE)" },
    { id: "asx", label: "Sídney (ASX)" },
  ],

  sectors: [
    { id: "tech", label: "Tecnología" },
    { id: "health", label: "Salud" },
    { id: "consumer", label: "Consumo" },
    { id: "energy", label: "Energía" },
    { id: "finance", label: "Finanzas" },
  ],

  brokers: [
    {
      id: "carlos",
      title: "Carlos R.",
      description: "Tecnología y energía · Perfil moderado",
    },
    {
      id: "andrea",
      title: "Andrea P.",
      description: "Salud y consumo · Perfil conservador",
    },
    {
      id: "none",
      title: "Sin comisionista",
      description: "Opero por mi cuenta. Puedo cambiarlo luego en mi perfil.",
    },
  ],

  notificationChannels: [
    { id: "email", label: "Correo" },
    { id: "sms", label: "SMS" },
    { id: "whatsapp", label: "WhatsApp" },
  ],

  plans: [
    {
      id: "basic",
      title: "Básico",
      description: "Compra, venta, portafolio y notificaciones de operaciones",
    },
    {
      id: "premium-monthly",
      title: "Premium · USD 12 al mes",
      description: "Alertas de precio y listas de observación.",
    },
    {
      id: "premium-yearly",
      title: "Premium · USD 120 al año",
      description: "Todo lo de Premium con pago anual. El cobro se procesa con Stripe.",
    },
  ],

  /** Valores preseleccionados que reflejan el estado del mockup. */
  defaults: {
    experienceLevel: "beginner",
    markets: ["nyse", "nasdaq"],
    sectors: ["tech"],
    broker: "carlos",
    notifications: ["email", "whatsapp"],
    plan: "basic",
  },
};
