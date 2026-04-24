import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const navigation = [
  { label: "My Collection", href: "/my-collection" },
  { label: "Catalog", href: "/" },
  { label: "Stores", href: "/" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Sales", href: "/" },
  { label: "Events", href: "/" },
];

const summaryCards = [
  { label: "Unique items", key: "uniqueItems" },
  { label: "Total copies", key: "totalCopies" },
  { label: "Graded items", key: "gradedItems" },
  { label: "Duplicates", key: "duplicates" },
  { label: "Unknown condition", key: "unknownCondition" },
  { label: "LEGO (name match)", key: "legoNameMatch" },
] as const;

type CollectionStats = Record<(typeof summaryCards)[number]["key"], number>;

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="topbar-search-icon" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

async function signOutAction() {
  "use server";

  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export default async function MyCollectionPage() {
  const { user, profile } = await requireRole("collector");
  const supabase = await createClient();

  let collectionError = "";
  let itemCount = 0;
  let stats: CollectionStats = {
    uniqueItems: 0,
    totalCopies: 0,
    gradedItems: 0,
    duplicates: 0,
    unknownCondition: 0,
    legoNameMatch: 0,
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("user_collections")
      .select("id, catalog_item_id, quantity, condition")
      .eq("collector_id", user.id);

    if (error) {
      collectionError = error.message;
    } else if (data) {
      itemCount = data.length;

      const uniqueItems = new Set(data.map((row) => row.catalog_item_id)).size;
      const totalCopies = data.reduce((sum, row) => sum + row.quantity, 0);
      const gradedItems = data.filter((row) => (row.condition ?? "").toLowerCase().includes("graded")).length;
      const duplicates = data.reduce((sum, row) => sum + Math.max(row.quantity - 1, 0), 0);
      const unknownCondition = data.filter((row) => {
        const value = (row.condition ?? "").trim().toLowerCase();
        return value.length === 0 || value === "unknown";
      }).length;

      stats = {
        uniqueItems,
        totalCopies,
        gradedItems,
        duplicates,
        unknownCondition,
        legoNameMatch: 0,
      };
    }
  }

  return (
    <main className="collection-screen">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="CollectorsHub home">
          <span className="brand-mark">CH</span>
          <span>CollectorsHub</span>
        </Link>

        <div className="topbar-main">
          <button className="delivery-pill" type="button">
            Delivering to New Glasgow B2H
          </button>

          <label className="search-box">
            <SearchIcon />
            <input type="search" placeholder="Search for Collectables..." />
          </label>
        </div>

        <div className="topbar-actions">
          <button className="language-button" type="button">
            EN
          </button>

          <form action={signOutAction}>
            <button className="login-button" type="submit">
              Sign Out
            </button>
          </form>

          <button className="cart-button" type="button">
            Cart
          </button>
        </div>
      </header>

      <nav className="nav-row" aria-label="Primary">
        {navigation.map((item) => (
          <Link
            className={item.href === "/my-collection" ? "nav-pill nav-pill-active" : "nav-pill"}
            href={item.href}
            key={item.label}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="collection-shell">
        <div className="collection-header">
          <div>
            <h1>My Collection</h1>
            <p className="collection-subtle">{itemCount} items</p>
          </div>
          <button className="collection-primary" type="button">
            Add items
          </button>
        </div>

        <p className="collection-count">Showing {itemCount} of {itemCount} items</p>

        <section className="collection-stats" aria-label="Collection summary">
          {summaryCards.map((card) => (
            <article className="collection-stat-card" key={card.key}>
              <span>{card.label}</span>
              <strong>{stats[card.key]}</strong>
            </article>
          ))}
        </section>

        <div className="collection-tabs" role="tablist" aria-label="Collection views">
          <button className="collection-tab active" type="button">
            Items
          </button>
          <button className="collection-tab" type="button">
            Minifigs
          </button>
          <button className="collection-tab" type="button">
            Insights
          </button>
        </div>

        {collectionError ? <div className="collection-error">{collectionError}</div> : null}

        <section className="collection-content">
          <aside className="collection-filters">
            <h2>Filters</h2>

            <label className="collection-field">
              <span>Category</span>
              <select defaultValue="all">
                <option value="all">All Categories</option>
              </select>
            </label>

            <label className="collection-field">
              <span>Grading</span>
              <select defaultValue="all">
                <option value="all">All</option>
                <option value="graded">Graded</option>
                <option value="raw">Raw</option>
              </select>
            </label>

            <label className="collection-field">
              <span>Sale status</span>
              <select defaultValue="all">
                <option value="all">All</option>
                <option value="not-listed">Not listed</option>
                <option value="for-sale">For sale</option>
                <option value="sold">Sold</option>
              </select>
            </label>

            <p className="collection-note">Applies once sale status is stored per item.</p>

            <button className="collection-reset" type="button">
              Reset filters
            </button>
          </aside>

          <div className="collection-results">
            <div className="collection-toolbar">
              <label className="collection-search">
                <input type="search" placeholder="Search your collection..." />
              </label>

              <label className="collection-sort">
                <span>Sort</span>
                <select defaultValue="name">
                  <option value="name">Name</option>
                  <option value="recent">Most recent</option>
                  <option value="value">Highest value</option>
                </select>
              </label>
            </div>

            <section className="collection-empty-state">
              <h3>Nothing here yet</h3>
              <p>
                Add items to your collection{profile.display_name ? `, ${profile.display_name},` : ""} and they&apos;ll
                show up here.
              </p>
              <div className="collection-empty-actions">
                <button className="collection-primary" type="button">
                  Add items
                </button>
                <Link className="collection-secondary" href="/">
                  Browse catalog
                </Link>
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
