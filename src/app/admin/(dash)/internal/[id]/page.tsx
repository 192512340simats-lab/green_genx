import RegistrationDetail from "@/components/admin/RegistrationDetail";

export const dynamic = "force-dynamic";

export default async function InternalRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RegistrationDetail id={id} category="internal" />;
}
