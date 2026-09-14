import "server-only";

import { cache } from "react";
import type { QueryResult, QueryResultRow } from "pg";
import {
  queryDb,
  withAuthenticatedTransaction,
  withTransaction,
  type DbQuery,
} from "@/lib/db/client";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";

const DEFAULT_DEMO_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

export class AuthRequiredError extends Error {
  constructor() {
    super("Silakan masuk terlebih dahulu.");
    this.name = "AuthRequiredError";
  }
}

interface RequestIdentity {
  demo: boolean;
  userId: string | null;
}

const getRequestIdentity = cache(async (): Promise<RequestIdentity> => {
  if (isDemoMode()) return { demo: true, userId: null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (error || !userId) throw new AuthRequiredError();
  return { demo: false, userId };
});

/**
 * ID warung untuk request aktif. Akun baru mendapat warung kosong miliknya
 * sendiri; data demo lama tidak pernah otomatis diklaim oleh orang pertama
 * yang mendaftar.
 */
export const getCurrentBusinessId = cache(async (): Promise<string> => {
  const identity = await getRequestIdentity();
  if (identity.demo) {
    return process.env.TAKAR_DEMO_BUSINESS_ID || DEFAULT_DEMO_BUSINESS_ID;
  }

  const userId = identity.userId as string;
  return withAuthenticatedTransaction(userId, async (query) => {
    const existing = await query<{ id: string }>(
      "select id from businesses order by created_at limit 1",
    );
    if (existing.rows[0]?.id) return existing.rows[0].id;

    const created = await query<{ id: string }>(
      `insert into businesses (owner_id, name, region_id, packaging_mode)
       select $1, 'Warungku', min(id), 'mixed' from regions
       returning id`,
      [userId],
    );
    const businessId = created.rows[0]?.id;
    if (!businessId) throw new Error("Wilayah belum tersedia untuk membuat warung.");
    return businessId;
  });
});

/** Kueri request web: RLS aktif di mode akun, ID eksplisit di mode demo. */
export async function queryAppDb<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<Row>> {
  const identity = await getRequestIdentity();
  if (identity.demo) return queryDb<Row>(text, params);
  return withAuthenticatedTransaction(identity.userId as string, (query) =>
    query<Row>(text, params),
  );
}

export async function withAppTransaction<T>(operation: (query: DbQuery) => Promise<T>): Promise<T> {
  const identity = await getRequestIdentity();
  if (identity.demo) return withTransaction(operation);
  return withAuthenticatedTransaction(identity.userId as string, operation);
}

export function isAuthRequiredError(error: unknown): error is AuthRequiredError {
  return error instanceof AuthRequiredError;
}
