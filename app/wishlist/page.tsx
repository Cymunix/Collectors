import Link from "next/link";
import { requireRole } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const { profile } = await requireRole("collector");

  return (
    <main className="simple-page">
      <section className="simple-panel">
        <h1>Wishlist</h1>
        <p>{profile.display_name ?? profile.email}, wishlist access is limited to collector accounts.</p>
        <Link href="/">Return home</Link>
      </section>
    </main>
  );
}
