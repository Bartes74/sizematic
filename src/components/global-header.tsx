'use client';
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { createClient } from "@/lib/supabase/client";
import type { BrandingSettings, UserRole } from "@/lib/types";

type GlobalHeaderProps = {
  userName?: string | null;
  role?: UserRole;
  avatarUrl?: string | null;
  branding?: BrandingSettings | null;
};

export function GlobalHeader({
  userName,
  role = "free",
  avatarUrl,
  branding,
}: GlobalHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const brandingConfig: BrandingSettings = branding ?? {
    site_name: "SizeHub",
    site_claim: "SizeSync",
    logo_url: null,
    logo_path: null,
  };

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = userName ? userName.trim().slice(0, 1).toUpperCase() || "S" : "S";
  const logoAlt = `${brandingConfig.site_name} logo`;

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/60 backdrop-blur"
      style={{ backgroundColor: 'var(--surface-elevated)' }}
    >
      <div className="mx-auto flex h-[100px] max-w-6xl items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
            {brandingConfig.logo_url ? (
              <Image
                src={brandingConfig.logo_url}
                alt={logoAlt}
                fill
                className="object-contain"
                sizes="48px"
                priority
              />
            ) : (
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 6h14l-1 10h-3l-1 5-3-4-3 4-1-5H6L5 6z" />
              </svg>
            )}
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              {brandingConfig.site_name}
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
              {brandingConfig.site_claim}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {userName && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/70 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/5"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={userName}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                    {initials}
                  </span>
                )}
                <span className="hidden sm:inline">{userName}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-border/40 bg-card/95 p-2 shadow-xl backdrop-blur">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard/measurements");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-primary/10"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M8 18h12" />
                      </svg>
                      Moje wymiary
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard/profile/edit");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-primary/10"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 6c-3.314 0-6 2.239-6 5h12c0-2.761-2.686-5-6-5z" />
                      </svg>
                      Edytuj profil
                    </button>
                    {role === "admin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          router.push("/dashboard/admin");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-primary/10"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h4.5v4.5h-4.5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 9.75h-4.5v-4.5h3a1.5 1.5 0 011.5 1.5v3zm-10.5-4.5v4.5H4.5v-3a1.5 1.5 0 011.5-1.5h3zM4.5 14.25h4.5v4.5h-3a1.5 1.5 0 01-1.5-1.5v-3zm10.5 4.5v-4.5h4.5v3a1.5 1.5 0 01-1.5 1.5h-3z" />
                        </svg>
                        Panel administratora
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h6M9 18h6M16 12l4-4m0 0l-4-4m4 4H8" />
                      </svg>
                      Wyloguj
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
