import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckinForm } from "./client";

export default async function CheckinTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ section?: string; activityId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const { token } = await params;
  const sp = await searchParams;
  return <CheckinForm token={token} initialSection={sp.section ?? "EDUCATIONAL"} initialActivityId={sp.activityId ?? ""} />;
}
