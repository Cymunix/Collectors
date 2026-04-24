"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, UserRole } from "@/types/database";

type IconName = "search" | "globe" | "cart" | "chevron" | "map" | "lock" | "x";
type AccountType = "collector" | "store";
type AuthMode = "login" | "signup";

const navItems: {
  label: string;
  path?: string;
  role?: UserRole;
}[] = [
  { label: "My Collection", path: "/my-collection", role: "collector" },
  { label: "Catalog" },
  { label: "Stores" },
  { label: "Wishlist", path: "/wishlist", role: "collector" },
  { label: "Sales" },
  { label: "Events" },
];

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
      </svg>
    );
  }

  if (name === "cart") {
    return (
      <svg {...common}>
        <path d="M6 6h15l-1.8 8.2a2 2 0 0 1-2 1.6H9.1a2 2 0 0 1-2-1.7L5.7 3.8H3" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
  }

  if (name === "map") {
    return (
      <svg {...common}>
        <path d="M12 21s7-5.4 7-11a7 7 0 0 0-14 0c0 5.6 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function EmptyCard({ compact = false }: { compact?: boolean }) {
  return <article className={compact ? "empty-card compact-card" : "empty-card"} />;
}

function TrendingCard() {
  return (
    <article className="empty-card trending-card">
      <span>No purchases yet</span>
    </article>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      <a href="#" aria-label={`View all ${title.toLowerCase()}`}>
        View all
      </a>
    </div>
  );
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function formatAuthError(message: string, email: string) {
  if (message.toLowerCase().includes("email rate limit exceeded")) {
    return "Supabase has hit its built-in email limit. Wait for the hourly window to reset, invite/create the test user from the Supabase dashboard, or configure custom SMTP for normal signup testing.";
  }

  if (message.includes("Email address") && message.includes("is invalid")) {
    if (email.endsWith("@collectorshub.ca")) {
      return "Supabase is rejecting collectorshub.ca right now. That domain does not appear to have DNS/MX records yet, so use a real inbox for testing or configure the domain email records first.";
    }

    return "Supabase rejected that email address. Check for typos, extra spaces, and that the domain can receive email.";
  }

  return message;
}

async function loadOrCreateCollectorProfile(params: {
  user: User;
  email: string;
  displayName?: string;
}) {
  const supabase = createClient();

  if (!supabase) {
    return null;
  }

  const { user, email, displayName } = params;
  const { data: existingProfile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();

  if (existingProfile) {
    return existingProfile as UserProfile;
  }

  const nextDisplayName =
    displayName?.trim() ||
    String(user.user_metadata?.display_name ?? "").trim() ||
    String(user.email?.split("@")[0] ?? "").trim() ||
    null;

  const payload = {
    id: user.id,
    email: email || user.email || "",
    role: "collector" as const,
    display_name: nextDisplayName,
  };

  const { error: insertError } = await supabase.from("users").upsert(payload);

  if (insertError) {
    throw insertError;
  }

  const { data: createdProfile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  return (createdProfile as UserProfile | null) ?? null;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("collector");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [accessMessage, setAccessMessage] = useState("");

  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      return;
    }

    const client = supabase;

    async function loadProfile(userId: string) {
      const { data } = await client.from("users").select("*").eq("id", userId).maybeSingle();

      if (data) {
        setProfile(data as UserProfile | null);
        return data as UserProfile | null;
      }

      const {
        data: { user: currentUser },
      } = await client.auth.getUser();

      if (!currentUser || currentUser.id !== userId) {
        setProfile(null);
        return null;
      }

      const recoveredProfile = await loadOrCreateCollectorProfile({
        user: currentUser,
        email: currentUser.email ?? "",
      });

      setProfile(recoveredProfile);
      return recoveredProfile;
    }

    async function loadAuth() {
      const {
        data: { user: currentUser },
      } = await client.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }

    }

    void loadAuth();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        void loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function handleNavClick(item: (typeof navItems)[number]) {
    if (item.role && !isLoggedIn) {
      openAuthModal(item.role, "login");
      return;
    }

    if (item.role && profile?.role !== item.role) {
      setAccessMessage(
        item.role === "collector"
          ? "This area is only available to collector accounts."
          : "This area is only available to approved store accounts.",
      );
      return;
    }

    if (item.path) {
      window.location.href = item.path;
    }
  }

  function openAuthModal(type: AccountType = "collector", mode: AuthMode = "login") {
    setAccountType(type);
    setAuthMode(type === "store" ? "login" : mode);
    setAuthError("");
    setAuthNotice("");
    setShowAuthModal(true);
  }

  function closeAuthModal() {
    setShowAuthModal(false);
    setAuthError("");
    setAuthNotice("");
  }

  function switchAccountType(type: AccountType) {
    setAccountType(type);
    setAuthMode(type === "store" ? "login" : authMode);
    setAuthError("");
    setAuthNotice("");
  }

  async function completeLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createClient();
    const formData = new FormData(event.currentTarget);
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("name") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    setAuthError("");
    setAuthNotice("");

    if (!supabase) {
      setAuthError("Supabase is not configured. Add your project URL and publishable key to .env.local.");
      return;
    }

    if (accountType === "store" && authMode === "signup") {
      showStoreSignupMessage();
      return;
    }

    if (authMode === "signup") {
      if (password !== confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "collector",
            display_name: displayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setAuthError(formatAuthError(error.message, email));
        return;
      }

      if (data.user && data.session) {
        setUser(data.user);
        const nextProfile = await loadOrCreateCollectorProfile({
          user: data.user,
          email,
          displayName,
        });
        setProfile(nextProfile);
        setShowAuthModal(false);
        return;
      }

      setAuthNotice("Check your email to confirm your collector account.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(formatAuthError(error.message, email));
      return;
    }

    let typedProfile = (await supabase.from("users").select("*").eq("id", data.user.id).maybeSingle()).data as UserProfile | null;

    if (!typedProfile && accountType === "collector") {
      try {
        typedProfile = await loadOrCreateCollectorProfile({
          user: data.user,
          email,
        });
      } catch (profileError) {
        const message = profileError instanceof Error ? profileError.message : "Unable to create collector profile.";
        await supabase.auth.signOut();
        setAuthError(message);
        return;
      }
    }

    if (!typedProfile) {
      await supabase.auth.signOut();
      setAuthError("No role profile was found for this account. If this is a store login, the store profile still needs to be created in Supabase.");
      return;
    }

    if (typedProfile.role !== accountType) {
      await supabase.auth.signOut();
      setAuthError(`This email belongs to a ${typedProfile.role} account. Switch account type and try again.`);
      return;
    }

    setUser(data.user);
    setProfile(typedProfile);
    setShowAuthModal(false);
  }

  function showStoreSignupMessage() {
    setAuthError("Store accounts are created by CollectorsHub. Please log in with your approved store account.");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <main className="home-screen">
      <header className="topbar">
        <a className="brand" href="#" aria-label="CollectorsHub home">
          <span className="brand-mark">CH</span>
          <span>CollectorsHub</span>
        </a>

        <div className="topbar-main">
          <button className="delivery-pill" type="button">
            Delivering to New Glasgow B2H
            <Icon name="chevron" />
          </button>

          <label className="search-box">
            <Icon name="search" />
            <input type="search" placeholder="Search for Collectables..." />
          </label>
        </div>

        <div className="topbar-actions">
          <button className="language-button" type="button">
            <Icon name="globe" />
            EN
            <Icon name="chevron" />
          </button>

          <button className="login-button" type="button" onClick={isLoggedIn ? signOut : () => openAuthModal()}>
            {isLoggedIn ? "Sign Out" : "Login / Sign Up"}
          </button>

          <button className="cart-button" type="button">
            <Icon name="cart" />
            Cart
          </button>
        </div>
      </header>

      <nav className="nav-row" aria-label="Primary">
        {navItems.map((item) => {
          const locked = Boolean(item.role && (!isLoggedIn || profile?.role !== item.role));
          return (
            <button
              className={`nav-pill${locked ? " nav-pill-locked" : ""}`}
              key={item.label}
              type="button"
              onClick={() => handleNavClick(item)}
              aria-disabled={locked}
            >
              {locked ? <Icon name="lock" /> : null}
              {item.label}
            </button>
          );
        })}
      </nav>

      {accessMessage ? (
        <section className="access-banner" role="status">
          <span>{accessMessage}</span>
          <button type="button" onClick={() => setAccessMessage("")}>
            Dismiss
          </button>
        </section>
      ) : null}

      <section className="hero">
        <h1>CollectorsHub</h1>
        <p>Track, Value, and Trade Your Collectibles</p>
      </section>

      <section className="dashboard" aria-label="CollectorsHub overview">
        <div className="events-panel">
          <SectionHeader title="Events Near You" />
          <div className="large-card-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <EmptyCard key={`event-${index}`} />
            ))}
          </div>
        </div>

        <div className="trending-panel">
          <SectionHeader title="Trending Items" />
          <div className="trending-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <TrendingCard key={`trend-${index}`} />
            ))}
          </div>
        </div>

        <div className="sales-panel">
          <SectionHeader title="Sales Near You" />
          <div className="large-card-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <EmptyCard key={`sale-${index}`} compact={index > 2} />
            ))}
          </div>
        </div>
      </section>

      {showAuthModal ? (
        <div className="modal-backdrop" role="presentation">
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" type="button" onClick={closeAuthModal} aria-label="Close login screen">
              <Icon name="x" />
            </button>

            <h2 id="auth-title">{authMode === "login" ? "Welcome Back" : "Create Account"}</h2>
            <p className="auth-subtitle">
              {accountType === "collector"
                ? authMode === "login"
                  ? "Log in to access your collection."
                  : "Start tracking your collection."
                : "Log in to manage your store."}
            </p>

            <div className="account-switch" aria-label="Choose account type">
              <button
                className={accountType === "collector" ? "switch-option active" : "switch-option"}
                type="button"
                onClick={() => switchAccountType("collector")}
              >
                Collector
              </button>
              <button
                className={accountType === "store" ? "switch-option active" : "switch-option"}
                type="button"
                onClick={() => switchAccountType("store")}
              >
                Store
              </button>
            </div>

            <div className="mode-switch" aria-label="Choose login or sign up">
              <button
                className={authMode === "login" ? "mode-option active" : "mode-option"}
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthNotice("");
                }}
              >
                Login
              </button>
              <button
                className={authMode === "signup" ? "mode-option active" : "mode-option"}
                type="button"
                onClick={() => {
                  if (accountType === "store") {
                    showStoreSignupMessage();
                    return;
                  }

                  setAuthMode("signup");
                  setAuthError("");
                  setAuthNotice("");
                }}
                aria-disabled={accountType === "store"}
              >
                Sign Up
              </button>
            </div>

            <form className="auth-form" key={`${accountType}-${authMode}`} onSubmit={completeLogin}>
              {authMode === "signup" ? (
                <label className="field-label">
                  Display Name
                  <input type="text" name="name" placeholder="Your name" required />
                </label>
              ) : null}

              <label className="field-label">
                Email
                <input
                  type="email"
                  name="email"
                  defaultValue={accountType === "collector" ? "testadmin@imperial.ca" : ""}
                  placeholder={accountType === "store" ? "store@example.com" : "you@example.com"}
                  required
                />
              </label>

              <label className="field-label">
                Password
                <input type="password" name="password" defaultValue={authMode === "login" ? "password" : ""} required />
              </label>

              {authMode === "signup" ? (
                <label className="field-label">
                  Confirm Password
                  <input type="password" name="confirmPassword" required />
                </label>
              ) : null}

              {accountType === "store" ? (
                <p className="store-note">Store accounts must be approved before login access is issued.</p>
              ) : null}

              {authNotice ? <p className="auth-notice">{authNotice}</p> : null}
              {authError ? <p className="auth-error">{authError}</p> : null}

              <button className="primary-action auth-submit" type="submit">
                {authMode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
