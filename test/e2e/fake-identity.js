// Test stand-in for @netlify/identity: "accounts" are just a cookie with an id.
export class AuthError extends Error { constructor(m, status) { super(m); this.status = status; } }
const read = () => { try { return JSON.parse(localStorage.getItem("fakeUser")); } catch { return null; } };
const set = u => { localStorage.setItem("fakeUser", JSON.stringify(u)); document.cookie = "fake_uid=" + encodeURIComponent(JSON.stringify({ id: u.id, email: u.email, name: u.name })) + "; path=/"; };
export async function getUser() { return read(); }
export async function login(email) { const u = { id: "u-" + email.split("@")[0], email, name: "", confirmedAt: "x" }; set(u); return u; }
export async function signup(email, p, d) { const u = { id: "u-" + email.split("@")[0], email, name: d.full_name, confirmedAt: "x" }; set(u); return u; }
export async function logout() { localStorage.removeItem("fakeUser"); document.cookie = "fake_uid=; path=/; max-age=0"; }
export async function handleAuthCallback() { return null; }
export async function requestPasswordRecovery() { }
export async function updateUser() { return read(); }
export async function refreshSession() { return null; }
