"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | null = null;

export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();

  if (!url || !publishableKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }

  return browserClient;
}
