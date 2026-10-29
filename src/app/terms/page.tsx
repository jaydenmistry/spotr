import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Spotr, including how to read its estimates.",
};

// Plain-language terms; have them reviewed by counsel before launch.
export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of service"
      updated="October 29, 2026"
      intro="These terms cover your use of Spotr. Using the service means you agree to them."
    >
      <h2>Using Spotr</h2>
      <p>
        Spotr is a tool for dealer buying desks to find, evaluate, and track vehicle acquisitions. Accounts are for
        your dealership&apos;s team; keep your sign-in details private and tell us if you think they&apos;ve been
        compromised.
      </p>

      <h2>Estimates are not appraisals</h2>
      <div className="prose-callout">
        <p>
          Opportunity scores, estimated value ranges, recommended max offers, and scenarios are produced by a
          deterministic heuristic from listing data and the assumptions you configure. They are planning estimates —{" "}
          <strong>not appraisals, market quotes, or guarantees</strong>. Verify condition, title, and history before
          making an offer.
        </p>
      </div>

      <h2>Listing data</h2>
      <p>
        Listings come from licensed third-party providers and may be incomplete, out of date, or wrong. Asking prices
        are what the listing shows. Use the source link on each listing to confirm details.
      </p>

      <h2>Practice chat</h2>
      <p>
        Practice chat is an AI simulation for rehearsing outreach. Replies are generated, not written by the seller,
        and nothing you type there is sent to a real seller.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t scrape, resell, or redistribute data from Spotr.</li>
        <li>Don&apos;t try to access other accounts or disrupt the service.</li>
        <li>Don&apos;t enter seller contact details or other sensitive personal information in notes.</li>
      </ul>

      <h2>Availability and changes</h2>
      <p>
        We work to keep Spotr available and accurate, but the service is provided as is. We may change or discontinue
        features, and we&apos;ll update these terms and the date above when they change.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
