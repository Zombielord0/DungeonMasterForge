import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";
import { handle } from "../lib/api.mjs";

let db;

export default async (req) => {
  db ??= getDatabase().pool;
  let user = null;
  try {
    const u = await getUser();
    if (u) user = { id: u.id, email: u.email, name: u.name || "" };
  } catch { user = null; }
  return handle(req, user, db);
};

export const config = { path: "/api/*" };
