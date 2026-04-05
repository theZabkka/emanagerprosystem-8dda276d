import { test, expect } from "@playwright/test";
import { mockSupabaseAuth, mockSupabaseQuery, mockRealtimeWebsocket } from "./helpers/mock-auth";
import { SUPABASE_URL, TICKET_NEW } from "./helpers/fixtures";

test.describe("Ticket lifecycle (client)", () => {
  const UNIQUE_TITLE = `E2E-SMOKE-${Date.now()}`;

  test("client creates a ticket and sees it in the list", async ({ page }) => {
    await mockRealtimeWebsocket(page);
    await mockSupabaseAuth(page, "klient");

    // Pre-mock empty ticket list + common tables
    await mockSupabaseQuery(page, "projects", []);
    await mockSupabaseQuery(page, "tasks", []);
    await mockSupabaseQuery(page, "client_ideas", []);
    await mockSupabaseQuery(page, "activity_log", []);
    await mockSupabaseQuery(page, "ticket_messages", []);
    await mockSupabaseQuery(page, "ticket_attachments", []);
    await mockSupabaseQuery(page, "ticket_comments", []);

    // Tickets GET initially returns empty
    let ticketsList: typeof TICKET_NEW[] = [];
    await page.route(`${SUPABASE_URL}/rest/v1/tickets**`, async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        // Capture the POST — the app is creating a ticket
        const postBody = route.request().postDataJSON();
        const created = { ...TICKET_NEW, ...postBody, title: UNIQUE_TITLE };
        ticketsList.push(created);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(ticketsList),
        });
      }
    });

    // Navigate to the new ticket form
    await page.goto("/client/tickets/new");
    await page.waitForLoadState("networkidle");

    // Fill the title field
    const titleInput = page.locator('input[name="title"], input[id="title"]').first();
    if (await titleInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await titleInput.fill(UNIQUE_TITLE);
    } else {
      // Fallback: try label-based
      await page.getByLabel(/temat|tytuł/i).first().fill(UNIQUE_TITLE);
    }

    // Try to fill department if there's a select
    const deptSelect = page.locator('select[name="department"], [id="department"]').first();
    if (await deptSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await deptSelect.selectOption({ index: 1 });
    }

    // Try to fill description in a rich text editor or textarea
    const editor = page.locator("[contenteditable=true]").first();
    if (await editor.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await editor.click();
      await editor.fill("Opis testowego zgłoszenia E2E");
    } else {
      const textarea = page.locator("textarea").first();
      if (await textarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await textarea.fill("Opis testowego zgłoszenia E2E");
      }
    }

    // Submit the form
    const submitBtn = page.getByRole("button", { name: /wyślij|utwórz|zapisz|send|submit/i }).first();
    await submitBtn.click();

    // After submit, app should redirect to ticket list or show the ticket
    // Wait for the unique title to appear somewhere on the page
    await expect(page.getByText(UNIQUE_TITLE)).toBeVisible({ timeout: 10_000 });
  });
});
