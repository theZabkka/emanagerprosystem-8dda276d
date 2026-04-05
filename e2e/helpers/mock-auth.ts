import { Page } from "@playwright/test";
import {
  SUPABASE_URL,
  USERS,
  PROFILES,
  CONTACT_DATA,
  ROLE_PERMISSIONS,
  CLIENTS,
} from "./fixtures";

type RoleKey = keyof typeof USERS;

/** Build a fake Supabase session object */
function fakeSession(role: RoleKey) {
  const user = USERS[role];
  return {
    access_token: `fake-access-token-${role}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `fake-refresh-token-${role}`,
    user,
  };
}

/**
 * Intercept all Supabase Auth endpoints so the app believes
 * a user with the given role is logged in — no real DB traffic.
 */
export async function mockSupabaseAuth(page: Page, role: RoleKey) {
  const session = fakeSession(role);
  const profile = PROFILES[role];

  // --- Auth endpoints ---

  // POST /auth/v1/token  (signInWithPassword & token refresh)
  await page.route(`${SUPABASE_URL}/auth/v1/token**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) });
  });

  // GET /auth/v1/user
  await page.route(`${SUPABASE_URL}/auth/v1/user`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session.user) });
  });

  // --- Inject session into localStorage so Supabase JS client picks it up ---
  await page.addInitScript(
    ({ url, sess }) => {
      const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
      localStorage.setItem(storageKey, JSON.stringify(sess));
    },
    { url: SUPABASE_URL, sess: session },
  );

  // --- Profile query ---
  await page.route(`${SUPABASE_URL}/rest/v1/profiles**`, async (route) => {
    const url = route.request().url();
    // single profile fetch (eq filter on id)
    if (url.includes(`id=eq.${profile.id}`)) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(profile) });
    } else {
      // bulk profiles list (used by kanban, team selectors, etc.)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(Object.values(PROFILES)),
      });
    }
  });

  // --- Role permissions ---
  await page.route(`${SUPABASE_URL}/rest/v1/role_permissions**`, async (route) => {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(perms) });
  });

  // --- Customer contacts (for klient role) ---
  if (role === "klient") {
    await page.route(`${SUPABASE_URL}/rest/v1/customer_contacts**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CONTACT_DATA) });
    });
  }

  // --- Clients ---
  await page.route(`${SUPABASE_URL}/rest/v1/clients**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(CLIENTS) });
  });

  // --- Notifications (empty by default) ---
  await page.route(`${SUPABASE_URL}/rest/v1/notifications**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

/**
 * Mock a specific Supabase REST table with given data.
 * Overrides any previous route for the same table.
 */
export async function mockSupabaseQuery(page: Page, table: string, data: unknown) {
  await page.route(`${SUPABASE_URL}/rest/v1/${table}**`, async (route) => {
    const method = route.request().method();
    if (method === "GET" || method === "HEAD") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    } else if (method === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(data) });
    } else if (method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    } else {
      await route.fulfill({ status: 204 });
    }
  });
}

/** Mock the realtime websocket so it doesn't error */
export async function mockRealtimeWebsocket(page: Page) {
  await page.route(`${SUPABASE_URL}/realtime/**`, async (route) => {
    await route.abort();
  });
}
