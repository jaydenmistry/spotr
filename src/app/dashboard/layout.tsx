"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center text-orange-700">Loading...</div>;
  }

  if (status === "authenticated") {
    return (
      <div className="min-h-screen bg-white">
        <nav className="bg-white shadow-sm ring-1 ring-orange-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <span className="text-2xl font-bold text-orange-600 mr-8">Spotr</span>
                </div>
                <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                  <a
                    href="/dashboard"
                    className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-orange-300 hover:text-orange-700"
                  >
                    Pipeline
                  </a>
                  <a
                    href="/dashboard/inventory"
                    className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-orange-300 hover:text-orange-700"
                  >
                    Inventory
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  return null;
}
