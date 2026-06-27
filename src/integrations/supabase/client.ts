// Intercept and mock Supabase Client for local testing / bypass rate limits
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

class MockBuilder {
  private table: string;
  private method: "select" | "insert" | "update" | "upsert" | "delete";
  private args: any[] = [];
  private filters: { type: string; field: string; value: any }[] = [];
  private orderCol?: string;
  private orderAscending = true;
  private limitCount?: number;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(
    table: string,
    method: "select" | "insert" | "update" | "upsert" | "delete",
    ...args: any[]
  ) {
    this.table = table;
    this.method = method;
    this.args = args;
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
    const token = typeof window !== "undefined" ? localStorage.getItem("sb-mock-token") : "";
    const response = await fetch("/api/mock-db", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
      body: JSON.stringify({
        table: this.table,
        method: this.method,
        args: this.args,
        filters: this.filters,
        orderCol: this.orderCol,
        orderAscending: this.orderAscending,
        limitCount: this.limitCount,
        isSingle: this.isSingle,
        isMaybeSingle: this.isMaybeSingle,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      return { data: null, error: { message: errText } };
    }
    const data = await response.json();
    return { data, error: null };
  }
}

const mockAuthListeners = new Set<(event: string, session: any) => void>();

export const mockAuth = {
  async signUp(options: { email: string; password?: string }) {
    const response = await fetch("/api/mock-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "users",
        method: "signUp",
        args: [{ email: options.email, password: options.password }],
      }),
    });
    const res = await response.json();
    if (res.error) return { data: { user: null, session: null }, error: res.error };

    const session = res.data.session;
    localStorage.setItem("sb-mock-token", session.access_token);
    localStorage.setItem("sb-mock-user", JSON.stringify(session.user));

    mockAuthListeners.forEach((cb) => cb("SIGNED_IN", session));
    return { data: res.data, error: null };
  },

  async signInWithPassword(options: { email: string; password?: string }) {
    const response = await fetch("/api/mock-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "users",
        method: "signIn",
        args: [{ email: options.email, password: options.password }],
      }),
    });
    const res = await response.json();
    if (res.error) return { data: { user: null, session: null }, error: res.error };

    const session = res.data.session;
    localStorage.setItem("sb-mock-token", session.access_token);
    localStorage.setItem("sb-mock-user", JSON.stringify(session.user));

    mockAuthListeners.forEach((cb) => cb("SIGNED_IN", session));
    return { data: res.data, error: null };
  },

  async signOut() {
    localStorage.removeItem("sb-mock-token");
    localStorage.removeItem("sb-mock-user");
    mockAuthListeners.forEach((cb) => cb("SIGNED_OUT", null));
    return { error: null };
  },

  async getSession() {
    const token = localStorage.getItem("sb-mock-token");
    const userStr = localStorage.getItem("sb-mock-user");
    if (!token || !userStr) return { data: { session: null }, error: null };
    return {
      data: {
        session: {
          access_token: token,
          user: JSON.parse(userStr),
        },
      },
      error: null,
    };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    mockAuthListeners.add(callback);
    this.getSession().then(({ data }) => {
      callback(data.session ? "SIGNED_IN" : "INITIAL_SESSION", data.session);
    });
    return {
      data: {
        subscription: {
          unsubscribe() {
            mockAuthListeners.delete(callback);
          },
        },
      },
    };
  },
};

export const mockStorage = {
  from(bucket: string) {
    return {
      async upload(filePath: string, file: File, options?: any) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", bucket);
        formData.append("path", filePath);

        const response = await fetch("/api/mock-storage", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          return { data: null, error: { message: errText } };
        }

        const data = await response.json();
        return { data, error: null };
      },

      async createSignedUrl(filePath: string, expires: number) {
        const url = `/mock-storage/${bucket}/${filePath}`;
        return { data: { signedUrl: url }, error: null };
      },
    };
  },
};

// Create actual client as backup or metadata
function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== "undefined" ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch {
    return null;
  }
}

const realSupabase = createSupabaseClient();

export const supabase = new Proxy({} as any, {
  get(_, prop) {
    if (prop === "auth") {
      return mockAuth;
    }
    if (prop === "storage") {
      return mockStorage;
    }
    if (prop === "from") {
      return (table: string) => new MockBuilder(table, "select");
    }
    if (realSupabase) {
      return Reflect.get(realSupabase, prop);
    }
    return undefined;
  },
});
