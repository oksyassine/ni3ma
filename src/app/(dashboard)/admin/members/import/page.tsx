import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ImportClient } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.includes("ADMIN") && !session.user.roles.includes("BUREAU")) {
    redirect("/unauthorized");
  }
  return <ImportClient />;
}
