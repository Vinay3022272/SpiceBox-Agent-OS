import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();

  const user = {
    id: userId,
    fullName: clerkUser?.fullName || null,
    firstName: clerkUser?.firstName || null,
    email: clerkUser?.primaryEmailAddress?.emailAddress,
    imageUrl: clerkUser?.imageUrl,
  };

  return <DashboardClient user={user} />;
}
