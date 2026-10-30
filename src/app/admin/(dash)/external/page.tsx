import { redirect } from "next/navigation";

export default function ExternalTeamsPage() {
  redirect("/admin/teams?category=external");
}
