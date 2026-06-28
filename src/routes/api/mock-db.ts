import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { checkRateLimit } from "../../lib/rate-limiter";

const DB_FILE = path.join(process.cwd(), "mock-db.json");

let memoryDb: any = null;

function readDb() {
  if (memoryDb) {
    return memoryDb;
  }

  let db = {
    profiles: [],
    meals: [],
    product_scans: [],
    saved_alternatives: [],
    users: [],
  };

  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to read mock-db.json, using empty in-memory DB:", err);
  }

  memoryDb = db;
  return db;
}

function writeDb(data: any) {
  memoryDb = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write mock-db.json (likely read-only filesystem), saved to memory only:", err);
  }
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export const Route = createFileRoute("/api/mock-db")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentLength = Number(request.headers.get("content-length"));
          if (contentLength > 5 * 1024 * 1024) {
            return new Response("Payload too large", { status: 413 });
          }

          const body = await request.json();
          const {
            table,
            method,
            args,
            filters,
            orderCol,
            orderAscending,
            limitCount,
            isSingle,
            isMaybeSingle,
          } = body;

          const db = readDb();

          // Auth check (if method is not signUp or signIn)
          let userId = "mock-test-user-id";
          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer /i, "").trim();
          if (token.startsWith("mock-token-")) {
            userId = token.replace("mock-token-", "");
          }

          // Rate limit checks for signUp and signIn
          const getIp = () => {
            const xForwardedFor = request.headers.get("x-forwarded-for");
            if (xForwardedFor) return xForwardedFor.split(",")[0].trim();
            return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "127.0.0.1";
          };
          const ip = getIp();

          if (table === "users" && (method === "signUp" || method === "signIn")) {
            try {
              checkRateLimit("mock-auth", ip);
            } catch (err: any) {
              return new Response(
                JSON.stringify({ data: null, error: { message: err.message } }),
                { status: 429, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          if (table === "users") {
            if (method === "signUp") {
              const { email, password } = args[0];
              const hashedPassword = hashPassword(password);
              const existing = db.users.find((u: any) => u.email === email);
              if (existing) {
                if (existing.password !== password && existing.password !== hashedPassword) {
                  return new Response(
                    JSON.stringify({ data: null, error: { message: "User already exists with different credentials" } }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                  );
                }
                const session = {
                  access_token: "mock-token-" + existing.id,
                  user: { id: existing.id, email: existing.email },
                };
                return new Response(
                  JSON.stringify({ data: { user: existing, session }, error: null }),
                );
              }
              const newUser = {
                id: "mock-uid-" + Math.random().toString(36).substring(2, 15),
                email,
                password: hashedPassword,
              };
              db.users.push(newUser);

              // Automatically insert a profile matching the trigger
              const newProfile = {
                id: newUser.id,
                email: newUser.email,
                target_calories: 2000,
                target_protein: 150,
                target_carbs: 230,
                target_fat: 65,
                created_at: new Date().toISOString(),
              };
              db.profiles.push(newProfile);

              writeDb(db);

              const session = {
                access_token: "mock-token-" + newUser.id,
                user: { id: newUser.id, email: newUser.email },
              };
              return new Response(
                JSON.stringify({ data: { user: newUser, session }, error: null }),
              );
            }

            if (method === "signIn") {
              const { email, password } = args[0];
              let user = db.users.find((u: any) => u.email === email);

              // Auto-create for testing if it doesn't exist
              if (!user) {
                user = {
                  id: "mock-uid-" + Math.random().toString(36).substring(2, 15),
                  email,
                  password: hashPassword(password),
                };
                db.users.push(user);

                const newProfile = {
                  id: user.id,
                  email: user.email,
                  target_calories: 2000,
                  target_protein: 150,
                  target_carbs: 230,
                  target_fat: 65,
                  created_at: new Date().toISOString(),
                };
                db.profiles.push(newProfile);
                writeDb(db);
              } else {
                const hashedPassword = hashPassword(password);
                if (user.password !== password && user.password !== hashedPassword) {
                  return new Response(
                    JSON.stringify({ data: null, error: { message: "Invalid credentials" } }),
                    { status: 400, headers: { "Content-Type": "application/json" } }
                  );
                }
                // Upgrade plain text to hashed password
                if (user.password === password) {
                  user.password = hashedPassword;
                  writeDb(db);
                }
              }

              const session = {
                access_token: "mock-token-" + user.id,
                user: { id: user.id, email: user.email },
              };
              return new Response(JSON.stringify({ data: { user, session }, error: null }));
            }
          }

          // DB Operations
          if (!db[table]) {
            db[table] = [];
          }

          let tableData = db[table];

          // Apply filters for select, update, delete
          const getFilteredRows = () => {
            return tableData.filter((row: any) => {
              // Ensure row belongs to the user if table has user_id or id (for profile)
              if (table === "profiles") {
                if (row.id !== userId) return false;
              } else if (row.user_id && row.user_id !== userId) {
                return false;
              }

              for (const f of filters || []) {
                const rowValue = row[f.field];
                if (f.type === "eq") {
                  if (rowValue !== f.value) return false;
                } else if (f.type === "gte") {
                  if (!rowValue || new Date(rowValue) < new Date(f.value)) return false;
                } else if (f.type === "lt") {
                  if (!rowValue || new Date(rowValue) >= new Date(f.value)) return false;
                }
              }
              return true;
            });
          };

          if (method === "select") {
            let rows = getFilteredRows();

            if (orderCol) {
              rows.sort((a: any, b: any) => {
                const valA = a[orderCol];
                const valB = b[orderCol];
                if (valA < valB) return orderAscending ? -1 : 1;
                if (valA > valB) return orderAscending ? 1 : -1;
                return 0;
              });
            }

            if (limitCount !== undefined) {
              rows = rows.slice(0, limitCount);
            }

            if (isSingle || isMaybeSingle) {
              return new Response(JSON.stringify(rows[0] || null));
            }

            // Check if count was requested
            const selectArgs = args?.[1] || {};
            if (selectArgs.count) {
              return new Response(JSON.stringify({ data: rows, count: rows.length }));
            }

            return new Response(JSON.stringify(rows));
          }

          if (method === "insert") {
            const dataToInsert = Array.isArray(args[0]) ? args[0] : [args[0]];
            const inserted: any[] = [];
            for (const item of dataToInsert) {
              const row = {
                id: item.id || "mock-id-" + Math.random().toString(36).substring(2, 15),
                user_id: userId,
                ...item,
                logged_at: item.logged_at || new Date().toISOString(),
                created_at: item.created_at || new Date().toISOString(),
                scanned_at: item.scanned_at || new Date().toISOString(),
              };
              tableData.push(row);
              inserted.push(row);
            }
            writeDb(db);
            return new Response(JSON.stringify(Array.isArray(args[0]) ? inserted : inserted[0]));
          }

          if (method === "upsert") {
            const dataToUpsert = Array.isArray(args[0]) ? args[0] : [args[0]];
            const upserted: any[] = [];
            for (const item of dataToUpsert) {
              const id = item.id || userId; // profiles upserts use user.id
              const existingIdx = tableData.findIndex((row: any) => row.id === id);
              if (existingIdx >= 0) {
                const existingRow = tableData[existingIdx];
                if (table === "profiles") {
                  if (existingRow.id !== userId) {
                    return new Response("Unauthorized: Cannot update another user's profile", { status: 403 });
                  }
                } else {
                  if (existingRow.user_id && existingRow.user_id !== userId) {
                    return new Response("Unauthorized: Cannot update another user's data", { status: 403 });
                  }
                }
                tableData[existingIdx] = { ...tableData[existingIdx], ...item, user_id: userId };
                upserted.push(tableData[existingIdx]);
              } else {
                const row = {
                  id,
                  user_id: userId,
                  ...item,
                  created_at: new Date().toISOString(),
                };
                tableData.push(row);
                upserted.push(row);
              }
            }
            writeDb(db);
            return new Response(JSON.stringify(Array.isArray(args[0]) ? upserted : upserted[0]));
          }

          if (method === "delete") {
            const rowsToDelete = getFilteredRows();
            const idsToDelete = new Set(rowsToDelete.map((r: any) => r.id));
            db[table] = tableData.filter((row: any) => !idsToDelete.has(row.id));
            writeDb(db);
            return new Response(JSON.stringify(rowsToDelete));
          }

          return new Response("Unknown method", { status: 400 });
        } catch (e: any) {
          return new Response(e.message, { status: 500 });
        }
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "Use POST to query mock database" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
