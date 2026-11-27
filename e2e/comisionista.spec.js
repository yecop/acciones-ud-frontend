import { expect, test } from "@playwright/test";
import { iniciarSesion } from "./ayudas.js";

const VALENTINA = "5d2e7a10-3c41-4b8e-9a52-0a1b2c3d4e08";

test.describe("comisionista y propuestas", () => {
  test("el inversionista elige comisionista y revisa su relación", async ({ page }) => {
    await iniciarSesion(page, "laura@correo.com");
    await page
      .getByRole("button", { name: /^propuestas$/i })
      .first()
      .click();
    await page.getByRole("link", { name: "Mi comisionista" }).click();
    await expect(page.getByRole("heading", { name: "Mi comisionista" })).toBeVisible();

    await page.getByRole("button", { name: "Elegir a Carlos R." }).click();
    await page.getByRole("button", { name: "Sí, elegir" }).click();
    await expect(page.getByText("Listo, tu comisionista ahora es Carlos R.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tu comisionista" })).toBeVisible();
  });

  test("el cliente aprueba una propuesta y el comisionista la firma", async ({ page }) => {
    // Cliente: aprueba con confirmación.
    await iniciarSesion(page, "mateo@correo.com");
    await page
      .getByRole("button", { name: /^propuestas$/i })
      .first()
      .click();
    await page.getByRole("link", { name: /ver propuesta: ampliar posición en nvidia/i }).click();
    await page.getByRole("button", { name: "Aprobar propuesta" }).click();
    await expect(page.getByRole("alertdialog", { name: "Confirmar aprobación" })).toBeVisible();
    await page.getByRole("button", { name: "Sí, aprobar" }).click();
    await expect(page.getByText("Propuesta aprobada. Estado: Aprobada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Firmar propuesta" })).toHaveCount(0);
    await page.getByRole("button", { name: /salir/i }).click();

    // Comisionista: firma con confirmación y se actualiza el estado.
    await iniciarSesion(page, "carlos@correo.com");
    await page
      .getByRole("button", { name: /^propuestas$/i })
      .first()
      .click();
    await page.getByRole("link", { name: /ver propuesta: ampliar posición en nvidia/i }).click();
    await expect(
      page.getByRole("button", { name: /aprobar propuesta|rechazar propuesta/i })
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Firmar propuesta" }).click();
    await page.getByRole("button", { name: "Sí, firmar" }).click();
    await expect(page.getByText("Propuesta firmada. Estado: Firmada.")).toBeVisible();
  });

  test("el comisionista crea una propuesta para su cliente", async ({ page }) => {
    await iniciarSesion(page, "carlos@correo.com");
    await page
      .getByRole("button", { name: /^mis clientes$/i })
      .first()
      .click();
    await page.getByRole("link", { name: "Ver cliente Mateo" }).click();
    await expect(page.getByRole("heading", { name: "Mateo" })).toBeVisible();
    await page.getByRole("link", { name: /nueva propuesta para mateo/i }).click();

    await page.getByLabel("Título").fill("Comprar AAPL");
    await page.getByLabel("Ticker de la orden 1").fill("AAPL");
    await page.getByLabel("Cantidad de la orden 1").fill("2");
    await page.getByRole("button", { name: "Enviar propuesta" }).click();
    await expect(page.getByRole("heading", { name: "Comprar AAPL" })).toBeVisible();
    await expect(page.getByText("Pendiente de aprobación").first()).toBeVisible();
  });

  test("un comisionista no accede a un cliente ajeno cambiando la URL", async ({ page }) => {
    await iniciarSesion(page, "carlos@correo.com");
    await page.goto(`/#/comisionista/clientes/${VALENTINA}`);
    await expect(page.getByRole("alert")).toContainText(/no está asignado a tu cuenta/i);
    await expect(page.getByText("Valentina")).toHaveCount(0);
  });
});
