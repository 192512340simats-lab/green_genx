import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in as an authorized admin? Go straight to the dashboard.
  const admin = await getAdmin();
  if (admin) redirect("/admin/dashboard");
  const params = await searchParams;
  const initialError = params.error === "link"
    ? "This sign-in link is invalid or expired. Request a new one."
    : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-bold tracking-tight text-brand-800">GREEN GENX</p>
          <p className="mt-1 text-sm text-ink-soft">Organizer sign-in</p>
        </div>

        <div className="card">
          <h1 className="text-xl font-semibold">Organizer sign-in</h1>
          <p className="mt-1 text-sm text-ink-soft">Enter an authorized organizer email to receive a one-time sign-in link.</p>
          <LoginForm initialError={initialError} />
        </div>

        <p className="mt-6 text-center text-sm text-ink-mute">
          <Link href="/dashboard" className="underline-offset-4 hover:underline">
            Public event dashboard
          </Link>
          <span className="mx-2" aria-hidden="true">·</span>
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to website
          </Link>
        </p>
      </div>
    </main>
  );
}
