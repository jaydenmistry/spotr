import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Data sources",
  description: "Where Spotr's listings come from, how fresh they are, and how its estimates are made.",
};

export default function DataSourcesPage() {
  return (
    <LegalPage
      eyebrow="Data sources"
      title="Where the data comes from."
      intro="Every number in Spotr is either provider data or a labeled Spotr estimate. Here's how each kind is sourced."
    >
      <h2>Listings</h2>
      <p>
        Spotr pulls active vehicle listings from <strong>Marketcheck</strong>, a licensed automotive data provider,
        through its official API. Your team chooses the search area (ZIP code and radius) and how many listings to pull.
        Listings are de-duplicated by VIN.
      </p>
      <p>
        Each listing shows its <strong>source</strong>, a link to the original listing when one is available, and when
        Spotr found it. &ldquo;Found by Spotr&rdquo; is the date we ingested the listing — not how long the vehicle has
        been for sale.
      </p>

      <h2>Prices</h2>
      <ul>
        <li>
          <strong>Asking price</strong> is the listing&apos;s price as supplied by the provider.
        </li>
        <li>
          <strong>Estimated retail range, max offer, and scenarios</strong> are Spotr estimates, labeled as such
          wherever they appear.
        </li>
        <li>
          <strong>Your offers</strong> are what your team records — kept separate from Spotr&apos;s estimates.
        </li>
      </ul>

      <h2>Scores and estimates</h2>
      <p>
        Opportunity scores come from a transparent, deterministic heuristic that weighs buy-box fit, estimated margin,
        price advantage, data confidence, and freshness. Every score shows its point breakdown and any risk deductions.
        Confidence reflects how complete a listing&apos;s data is — it is not a statistical confidence interval.
      </p>

      <h2>What Spotr doesn&apos;t do</h2>
      <div className="prose-callout">
        <p>
          Spotr does not scrape websites, automate logins, bypass CAPTCHAs, or automate Facebook Marketplace or
          Craigslist. New sources are added only through licensed feeds, official APIs, approved partners, or data your
          dealership imports itself.
        </p>
      </div>

      <h2>Sample data</h2>
      <p>
        Product previews on this site use clearly labeled sample data. Sample listings are never mixed into a
        dealership&apos;s workspace.
      </p>

      <h2>Questions</h2>
      <p>
        Want more detail about a source or a calculation? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
