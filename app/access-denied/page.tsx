import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="simple-page">
      <section className="simple-panel">
        <h1>Access denied</h1>
        <p>Your account role does not have access to this area.</p>
        <Link href="/">Return home</Link>
      </section>
    </main>
  );
}
