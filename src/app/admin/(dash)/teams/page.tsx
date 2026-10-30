import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import RegistrationTable from "@/components/admin/RegistrationTable";
import type { ParticipantCategory, PaymentStatus, RegistrationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUSES: RegistrationStatus[] = ["pending", "approved", "rejected"];
const CATEGORIES: ParticipantCategory[] = ["internal", "external"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "verified", "not_required"];

type SearchParams = Promise<{
  status?: string | string[];
  category?: string | string[];
  payment?: string | string[];
  page?: string | string[];
}>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function filterValue<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  return values.find((candidate) => candidate === value);
}

function pageNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminTeamsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = filterValue(firstParam(params.status), STATUSES);
  const category = filterValue(firstParam(params.category), CATEGORIES);
  const payment = filterValue(firstParam(params.payment), PAYMENT_STATUSES);
  const requestedPage = pageNumber(firstParam(params.page));
  const { supabase } = await requireAdminPage();

  const createQuery = () => {
    let query = supabase
      .from("registrations")
      .select(
        "id, registration_code, category, team_name, college_name, member_count, fee_per_member, total_fee, payment_status, status, created_at",
        { count: "exact" }
      );
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (payment) query = query.eq("payment_status", payment);
    return query;
  };

  const fetchPage = (page: number) => createQuery()
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  let currentPage = requestedPage;
  let { data, error, count } = await fetchPage(currentPage);
  if (error) throw new Error(`Could not load teams: ${error.message}`);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (currentPage > totalPages) {
    currentPage = totalPages;
    ({ data, error, count } = await fetchPage(currentPage));
    if (error) throw new Error(`Could not load teams: ${error.message}`);
  }

  function pageHref(page: number) {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (category) next.set("category", category);
    if (payment) next.set("payment", payment);
    next.set("page", String(page));
    return `/admin/teams?${next.toString()}`;
  }

  const heading = status === "pending"
    ? category ? `Awaiting review · ${category} teams` : "Awaiting review"
    : status === "approved"
      ? category ? `Approved · ${category} teams` : "Approved teams"
      : category ? `${category === "internal" ? "Internal" : "External"} teams` : "All teams";

  return (
    <section>
      <p className="eyebrow eyebrow-dark">Applications</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-brand-950">{heading}</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Review applications, verify payment proof, and make team decisions. External totals show the per-member fee multiplied by team size.
      </p>

      <form method="get" className="card mt-6 grid gap-4 sm:grid-cols-4 sm:items-end">
        <label>
          <span className="label">Application status</span>
          <select className="input" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Team category</span>
          <select className="input" name="category" defaultValue={category ?? ""}>
            <option value="">All categories</option>
            {CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Payment status</span>
          <select className="input" name="payment" defaultValue={payment ?? ""}>
            <option value="">All payments</option>
            {PAYMENT_STATUSES.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">Apply filters</button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{totalCount} team{totalCount === 1 ? "" : "s"} found</p>
        <Link href="/admin/teams" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
          Clear filters
        </Link>
      </div>
      <div className="mt-3">
        <RegistrationTable
          rows={data ?? []}
          emptyMessage="No teams match these filters."
          showCategory
          showPayments
        />
      </div>

      {totalCount > 0 && (
        <nav aria-label="Team pages" className="mt-5 flex items-center justify-between">
          {currentPage > 1
            ? <Link href={pageHref(currentPage - 1)} className="btn-secondary">← Previous</Link>
            : <span />}
          <span className="text-sm text-ink-soft">Page {currentPage} of {totalPages}</span>
          {currentPage < totalPages
            ? <Link href={pageHref(currentPage + 1)} className="btn-secondary">Next →</Link>
            : <span />}
        </nav>
      )}
    </section>
  );
}
