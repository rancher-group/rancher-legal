// Run ONLY inside the isolated local backend container. Output is private test
// access material: redirect to validation/local-access.json, chmod 600; never commit.
import { randomBytes } from "node:crypto";
if (process.env.NODE_ENV !== "development" || process.env.SUPABASE_URL !== "http://gateway:8000") {
    throw new Error("Local bootstrap requires the isolated development gateway.");
}
const password = randomBytes(24).toString("base64url");
const email = process.env.LOCAL_TEST_EMAIL ?? "e2e@mike.local";
if (!/^[a-z0-9.+_-]+@mike\.local$/.test(email)) {
    throw new Error("Local bootstrap accepts synthetic @mike.local identities only.");
}
const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
        "content-type": "application/json",
        apikey: process.env.SUPABASE_SECRET_KEY,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
});
if (!response.ok) throw new Error(`Local bootstrap refused (${response.status}); no existing user modified.`);
console.log(JSON.stringify({ email, password, note: "Synthetic local-only account. No production admin entitlement." }));
