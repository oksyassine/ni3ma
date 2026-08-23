import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProjectsListClient } from "./client";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  return <ProjectsListClient />;
}
