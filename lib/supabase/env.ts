export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function hasSupabaseEnv() {
  const { url, publishableKey } = getSupabaseEnv();
  return Boolean(url && publishableKey);
}
