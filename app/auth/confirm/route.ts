import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  if (tokenHash && type) {
    const supabase = await createClient();
    if (supabase) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

      if (!verifyError) {
        return NextResponse.redirect(redirectTo);
      }
    }
  }

  redirectTo.pathname = "/";
  redirectTo.searchParams.set("auth_error", "confirmation_failed");
  return NextResponse.redirect(redirectTo);
}
