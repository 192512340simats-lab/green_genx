import { redirect } from "next/navigation";

export default function InternalTeamsPage() {
  redirect("/admin/teams?category=internal");
}
