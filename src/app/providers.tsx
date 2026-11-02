"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { spring } from "@/lib/motion";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {/* reducedMotion="user": transforms are dropped for users who ask for
            less motion; opacity changes still play as gentle cross-fades. */}
        <MotionConfig reducedMotion="user" transition={spring.smooth}>
          {children}
        </MotionConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}
