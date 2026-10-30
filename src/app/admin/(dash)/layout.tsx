import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin/dashboard", label: "Overview" },
  { href: "/admin/internal", label: "Internal" },
  { href: "/admin/external", label: "External" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * Server-side admin guard for everything under /admin/(dash).
 * Every page inside must ALSO call requireAdminPage(), because Next.js does not
 * re-render a layout when navigating between its child pages.
 */
export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  return (
    <div className="min-h-screen bg-brand-50/60">
      <header className="border-b border-brand-100 bg-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="font-display text-lg font-bold text-brand-800">
              GREEN GENX <span className="font-medium text-ink-mute">Admin</span>
            </Link>
            <nav aria-label="Admin" className="flex flex-wrap gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-800"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="text-ink-soft underline-offset-4 hover:underline">
              View site
            </Link>
            <span className="hidden text-ink-mute sm:inline">{admin.email}</span>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="btn-secondary px-3 py-1.5">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container-page py-8">{children}</main>
    </div>
  );
}
