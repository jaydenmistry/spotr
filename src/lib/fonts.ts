import { Onest } from "next/font/google";

// Apple devices render the system SF Pro (`-apple-system` in globals.css);
// everyone else gets Onest. next/font downloads it at build time and serves it
// from our own origin, so the CSP's font-src 'self' still covers it. Not
// preloaded: browsers then fetch it only when the stack falls through to it,
// so Apple devices never download it.
export const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
  preload: false,
});
