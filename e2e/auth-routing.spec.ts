import { test, expect } from "@playwright/test";
import { mockSupabaseAuth, mockSupabaseQuery, mockRealtimeWebsocket } from "./helpers/mock-auth";
import { SUPABASE_URL } from "./helpers/fixtures";

test.describe("Auth & Routing isolation", () => {
  test("unauthenticated user is redirected to /login", async ({ page }) => {
    // Don't mock auth — user is not logged in.
    // Block real Supabase calls so the app gets "no session".
    await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route) => {
      const url = route.request().url();
      if (url.includes("/token")) {
        await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant" }) });
      } else {
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "not_authenticated" }) });
      }
    });
    await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
      await route.fulfill({ status: 401 });
    });

    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
  });

  test("klient is blocked from admin routes (/crm)", async ({ page }) => {
    await mockRealtimeWebsocket(page);
    await mockSupabaseAuth(page, "klient");

    // Mock common queries the dashboard might fire
    await mockSupabaseQuery(page, "projects", []);
    await mockSupabaseQuery(page, "tasks", []);
    await mockSupabaseQuery(page, "tickets", []);
    await mockSupabaseQuery(page, "client_ideas", []);
    await mockSupabaseQuery(page, "client_files", []);
    await mockSupabaseQuery(page, "client_contracts", []);
    await mockSupabaseQuery(page, "client_offers", []);
    await mockSupabaseQuery(page, "client_orders", []);
    await mockSupabaseQuery(page, "client_social_accounts", []);
    await mockSupabaseQuery(page, "client_conversations", []);
    await mockSupabaseQuery(page, "client_notes", []);
    await mockSupabaseQuery(page, "client_invoice_data", []);
    await mockSupabaseQuery(page, "activity_log", []);

    // Navigate to /crm — AdminRoute should redirect to /dashboard
    await page.goto("/crm");
    await page.waitForURL(/\/(dashboard|client)/, { timeout: 10_000 });

    const url = page.url();
    expect(url).not.toContain("/crm");
  });

  test("klient is blocked from /settings/permissions", async ({ page }) => {
    await mockRealtimeWebsocket(page);
    await mockSupabaseAuth(page, "klient");
    await mockSupabaseQuery(page, "projects", []);
    await mockSupabaseQuery(page, "tasks", []);
    await mockSupabaseQuery(page, "tickets", []);
    await mockSupabaseQuery(page, "client_ideas", []);
    await mockSupabaseQuery(page, "activity_log", []);

    await page.goto("/permissions");
    await page.waitForURL(/\/(dashboard|client)/, { timeout: 10_000 });

    const url = page.url();
    expect(url).not.toContain("/permissions");
  });
});
