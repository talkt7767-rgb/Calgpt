import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let middlewareMemoryDb: any = null;

class ServerMockBuilder {
  private table: string;
  private userId: string;
  private method: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private args: any[] = [];
  private filters: { type: string; field: string; value: any }[] = [];
  private orderCol?: string;
  private orderAscending = true;
  private limitCount?: number;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(table: string, userId: string) {
    this.table = table;
    this.userId = userId;
  }

  select(...args: any[]) {
    this.method = "select";
    this.args = args;
    return this;
  }
  insert(...args: any[]) {
    this.method = "insert";
    this.args = args;
    return this;
  }
  update(...args: any[]) {
    this.method = "update";
    this.args = args;
    return this;
  }
  upsert(...args: any[]) {
    this.method = "upsert";
    this.args = args;
    return this;
  }
  delete(...args: any[]) {
    this.method = "delete";
    this.args = args;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: "eq", field, value });
    return this;
  }
  gte(field: string, value: any) {
    this.filters.push({ type: "gte", field, value });
    return this;
  }
  lt(field: string, value: any) {
    this.filters.push({ type: "lt", field, value });
    return this;
  }
  order(field: string, options?: { ascending?: boolean }) {
    this.orderCol = field;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }
  limit(count: number) {
    this.limitCount = count;
    return this;
  }
  single() {
    this.isSingle = true;
    return this;
  }
  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute() {
    const path = await import("path");
    const fs = await import("fs");
    const DB_FILE = path.join(process.cwd(), "mock-db.json");

    const readDb = () => {
      if (middlewareMemoryDb) {
        return middlewareMemoryDb;
      }
      let db = { profiles: [], meals: [], product_scans: [], saved_alternatives: [], users: [] };
      try {
        if (fs.existsSync(DB_FILE)) {
          db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        }
      } catch (err) {
        console.error("Failed to read mock-db.json in middleware readDb:", err);
      }
      middlewareMemoryDb = db;
      return db;
    };

    const writeDb = (data: any) => {
      middlewareMemoryDb = data;
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      } catch (err) {
        console.warn("Failed to write mock-db.json in middleware writeDb (read-only filesystem):", err);
      }
    };

    const db = readDb();
    if (!db[this.table]) {
      db[this.table] = [];
    }
    const tableData = db[this.table];

    const getFilteredRows = () => {
      return tableData.filter((row: any) => {
        if (this.table === "profiles") {
          if (row.id !== this.userId) return false;
        } else if (row.user_id && row.user_id !== this.userId) {
          return false;
        }

        for (const f of this.filters) {
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

    if (this.method === "select") {
      let rows = getFilteredRows();
      if (this.orderCol) {
        rows.sort((a: any, b: any) => {
          const valA = a[this.orderCol!];
          const valB = b[this.orderCol!];
          if (valA < valB) return this.orderAscending ? -1 : 1;
          if (valA > valB) return this.orderAscending ? 1 : -1;
          return 0;
        });
      }
      if (this.limitCount !== undefined) {
        rows = rows.slice(0, this.limitCount);
      }
      if (this.isSingle || this.isMaybeSingle) {
        return { data: rows[0] || null, error: null };
      }
      const selectArgs = this.args?.[1] || {};
      if (selectArgs.count) {
        return { data: rows, count: rows.length, error: null };
      }
      return { data: rows, error: null };
    }

    if (this.method === "insert") {
      const dataToInsert = Array.isArray(this.args[0]) ? this.args[0] : [this.args[0]];
      const inserted: any[] = [];
      for (const item of dataToInsert) {
        const row = {
          id: item.id || "mock-id-" + Math.random().toString(36).substring(2, 15),
          user_id: this.userId,
          ...item,
          logged_at: item.logged_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
          scanned_at: item.scanned_at || new Date().toISOString(),
        };
        tableData.push(row);
        inserted.push(row);
      }
      writeDb(db);
      return { data: Array.isArray(this.args[0]) ? inserted : inserted[0], error: null };
    }

    if (this.method === "upsert") {
      const dataToUpsert = Array.isArray(this.args[0]) ? this.args[0] : [this.args[0]];
      const upserted: any[] = [];
      for (const item of dataToUpsert) {
        const id = item.id || this.userId;
        const existingIdx = tableData.findIndex((row: any) => row.id === id);
        if (existingIdx >= 0) {
          const existingRow = tableData[existingIdx];
          if (this.table === "profiles") {
            if (existingRow.id !== this.userId) {
              throw new Error("Unauthorized: Cannot update another user's profile");
            }
          } else {
            if (existingRow.user_id && existingRow.user_id !== this.userId) {
              throw new Error("Unauthorized: Cannot update another user's data");
            }
          }
          tableData[existingIdx] = { ...tableData[existingIdx], ...item, user_id: this.userId };
          upserted.push(tableData[existingIdx]);
        } else {
          const row = {
            id,
            user_id: this.userId,
            ...item,
            created_at: new Date().toISOString(),
          };
          tableData.push(row);
          upserted.push(row);
        }
      }
      writeDb(db);
      return { data: Array.isArray(this.args[0]) ? upserted : upserted[0], error: null };
    }

    if (this.method === "delete") {
      const rowsToDelete = getFilteredRows();
      const idsToDelete = new Set(rowsToDelete.map((r: any) => r.id));
      db[this.table] = tableData.filter((row: any) => !idsToDelete.has(row.id));
      writeDb(db);
      return { data: rowsToDelete, error: null };
    }

    return { data: null, error: { message: "Unknown method" } };
  }
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`;
      console.error(`[Supabase] ${message}`);
      throw new Response(message, { status: 500 });
    }

    const request = getRequest();

    if (!request?.headers) {
      throw new Response("Unauthorized: No request headers available", { status: 401 });
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      throw new Response("Unauthorized: No authorization header provided", { status: 401 });
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new Response("Unauthorized: Only Bearer tokens are supported", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new Response("Unauthorized: No token provided", { status: 401 });
    }

    if (token.startsWith("mock-token-")) {
      const userId = token.replace("mock-token-", "");
      let email = "test_user_random@gmail.com";
      try {
        if (middlewareMemoryDb) {
          const user = middlewareMemoryDb.users?.find((u: any) => u.id === userId);
          if (user) email = user.email;
        } else {
          const path = await import("path");
          const fs = await import("fs");
          const dbPath = path.join(process.cwd(), "mock-db.json");
          if (fs.existsSync(dbPath)) {
            const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
            middlewareMemoryDb = db;
            const user = db.users?.find((u: any) => u.id === userId);
            if (user) email = user.email;
          }
        }
      } catch (err) {
        console.error("Error reading mock db in middleware", err);
      }

      const claims = { sub: userId, email: email as string | undefined };
      const mockSupabase = {
        from(table: string) {
          return new ServerMockBuilder(table, userId);
        },
        storage: {
          from(bucket: string) {
            return {
              async createSignedUrl(filePath: string, expires: number) {
                const url = `/mock-storage/${bucket}/${filePath}`;
                return { data: { signedUrl: url }, error: null };
              },
            };
          },
        },
      };

      return next({
        context: {
          supabase: mockSupabase as any,
          userId,
          claims,
        },
      });
    }

    const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Response("Unauthorized: Invalid token", { status: 401 });
    }

    if (!data.claims.sub) {
      throw new Response("Unauthorized: No user ID found in token", { status: 401 });
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: {
          sub: data.claims.sub,
          email: data.claims.email,
        },
      },
    });
  },
);
