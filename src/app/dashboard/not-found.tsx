"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardNotFound() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 0" }}>
      <EmptyState
        icon={Compass}
        title="This page doesn't exist"
        body="It may have moved. Your feed and pipeline are where you left them."
        action={
          <Link href="/dashboard/feed" className="btn btn-primary pressable">
            Open the feed
          </Link>
        }
      />
    </div>
  );
}
