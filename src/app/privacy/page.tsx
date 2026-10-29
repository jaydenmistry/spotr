import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";
import { ARCHIVE_RETENTION_DAYS } from "@/lib/accessRequest";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Spotr collects, why, who processes it, and how to have it deleted.",
};

// Plain-language description of what the app actually does today. Have it
// reviewed by counsel before relying on it, and update it whenever data
// handling changes (new providers, analytics, processors).
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      updated="October 29, 2026"
      intro="Spotr collects only what it needs to help dealer buying desks evaluate vehicles. We don't sell personal information, and we don't use it for advertising."
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Access requests.</strong> When you request access we store your name, work email, dealership,
          role, and any message you include, so we can respond.
        </li>
        <li>
          <strong>Account details.</strong> Your sign-in email and a securely hashed password. A session cookie keeps
          you signed in; it is required for the app to work.
        </li>
        <li>
          <strong>Workspace data.</strong> Vehicle listings from our licensed data provider, and the actions your team
          takes on them — watches, passes and their reasons, stage changes, follow-ups, recorded offers, and notes.
        </li>
        <li>
          <strong>Practice chat.</strong> Messages you type in the practice chat, and the simulated replies.
        </li>
      </ul>

      <h2>What we don&apos;t collect</h2>
      <p>
        Spotr does not collect private sellers&apos; phone numbers, does not scrape marketplaces, and does not log in to
        third-party sites on your behalf. Listing data includes only the seller name the provider supplies.
      </p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>
          <strong>Our licensed vehicle-data provider</strong> receives the search area you choose (ZIP code and radius)
          when your team pulls listings.
        </li>
        <li>
          <strong>Google (Gemini API)</strong> receives your practice-chat messages, the conversation so far, and the
          listing&apos;s year, make, model, mileage, city and state, and the seller name the provider supplies, to
          generate the simulated seller&apos;s replies. Practice chat never contacts a real seller.
        </li>
        <li>
          <strong>Our hosting provider</strong> stores the application database.
        </li>
        <li>
          <strong>Sentry</strong>, if error monitoring is enabled, receives crash reports: the error, the page it happened
          on, and browser and device details. Request contents, cookies, IP addresses, and signed-in user details are not
          sent, and email addresses and VINs are removed from error text. Performance tracing is off.
        </li>
      </ul>
      <p>
        If privacy-friendly, cookieless analytics are enabled, they record aggregate page views without identifying
        you.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep workspace data — including practice-chat history — and account data while your account is active.
        Access requests stay on file while we&apos;re in touch; once archived, they&apos;re deleted automatically after{" "}
        {ARCHIVE_RETENTION_DAYS} days. You can ask us to delete your data sooner at any time.
      </p>

      <h2>Your choices</h2>
      <p>
        To access, correct, or delete your information — or to opt out of further contact — email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We&apos;ll confirm once it&apos;s done.
      </p>

      <h2>Changes</h2>
      <p>If we change how we handle data, we&apos;ll update this page and the date above.</p>
    </LegalPage>
  );
}
