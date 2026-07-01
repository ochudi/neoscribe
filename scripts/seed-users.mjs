#!/usr/bin/env node
/**
 * Seed NeoScribe's Supabase Auth users (admin + demo).
 *
 * These accounts are created with the Supabase Admin API, which needs the
 * SERVICE ROLE key. That key is a secret, so it is NOT stored in the repo —
 * pass it in via the environment when you run this:
 *
 *   SUPABASE_URL="https://<ref>.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
 *   node scripts/seed-users.mjs
 *
 * Credentials can be overridden with env vars (ADMIN_EMAIL, ADMIN_PASSWORD,
 * DEMO_EMAIL, DEMO_PASSWORD); the defaults below match what we agreed on.
 * Re-running is safe: an existing user is updated in place, not duplicated.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See the header of this file."
  );
  process.exit(1);
}

const USERS = [
  {
    email: process.env.ADMIN_EMAIL ?? "ofoma.chudi@gmail.com",
    password: process.env.ADMIN_PASSWORD ?? "chudi1",
    user_metadata: { full_name: "Chudi Ofoma", role: "admin" },
  },
  {
    email: process.env.DEMO_EMAIL ?? "chudi.sandbox@gmail.com",
    password: process.env.DEMO_PASSWORD ?? "secret_password_1#",
    user_metadata: { full_name: "NeoScribe Demo", role: "demo" },
  },
];

const admin = `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users`;
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function findUserByEmail(email) {
  const url = `${admin}?filter=${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const body = await res.json();
  const list = Array.isArray(body?.users) ? body.users : [];
  return list.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertUser(u) {
  const existing = await findUserByEmail(u.email);
  if (existing) {
    const res = await fetch(`${admin}/${existing.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        password: u.password,
        email_confirm: true,
        user_metadata: u.user_metadata,
      }),
    });
    if (!res.ok) throw new Error(`update ${u.email}: ${res.status} ${await res.text()}`);
    return `updated  ${u.email} (${u.user_metadata.role})`;
  }
  const res = await fetch(admin, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: u.user_metadata,
    }),
  });
  if (!res.ok) throw new Error(`create ${u.email}: ${res.status} ${await res.text()}`);
  return `created  ${u.email} (${u.user_metadata.role})`;
}

for (const u of USERS) {
  try {
    console.log(await upsertUser(u));
  } catch (e) {
    console.error(`failed   ${u.email}:`, e.message);
    process.exitCode = 1;
  }
}
