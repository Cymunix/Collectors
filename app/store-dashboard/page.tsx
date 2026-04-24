import Link from "next/link";
import { requireRole } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function StoreDashboardPage() {
  const { profile } = await requireRole("store");

  return (
    <main className="simple-page">
      <section className="simple-panel">
        <h1>Store Dashboard</h1>
        <p>{profile.store_name ?? profile.email}, your inventory tools are protected by store-only RLS.</p>
        <Link href="/">Return home</Link>
      </section>
    </main>
  );
}
