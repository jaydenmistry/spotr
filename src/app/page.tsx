import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const navItems = ["How it Works", "Product", "Solutions", "Company", "Resources"];

const logoCloud = [
  "Northline Auto",
  "Summit Ford",
  "Vista Motors",
  "Prime CDJR",
  "Oak City Toyota",
  "Metro Mazda",
  "Harbor Honda",
  "Canyon Kia",
];

const workflow = [
  {
    icon: Search,
    eyebrow: "Listing Intelligence",
    title: "Find the private sellers worth calling",
    copy:
      "Spotr pulls fresh local opportunities into one workspace so buyers can filter, compare, and prioritize inventory without tab-hopping.",
  },
  {
    icon: MessageSquare,
    eyebrow: "Seller Outreach",
    title: "Keep every conversation moving",
    copy:
      "Call, text, email, add notes, and move sellers through the acquisition pipeline from a single buying desk.",
  },
  {
    icon: Sparkles,
    eyebrow: "AI Assistance",
    title: "Spot patterns before your competitors",
    copy:
      "Surface promising vehicles, flag duplicate or low-fit listings, and help buyers focus on cars that match store demand.",
  },
];

const stats = [
  ["1", "buying desk"],
  ["24/7", "listing visibility"],
  ["Live", "seller pipeline"],
  ["AI", "opportunity ranking"],
];

const faqs = [
  [
    "What does Spotr do?",
    "Spotr helps dealerships source, qualify, contact, and acquire used vehicles directly from private sellers.",
  ],
  [
    "Does this replace our CRM?",
    "No. Spotr is focused on acquisition work: finding cars, managing seller conversations, and moving opportunities into inventory.",
  ],
  [
    "Can my team try the product?",
    "Yes. Use the login button to enter the current demo workspace and review the existing pipeline experience.",
  ],
];

const previewListings = [
  {
    name: "2018 Toyota 4Runner",
    price: "$31,500",
    miles: "54k mi",
    source: "Facebook",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "2021 Ford F-150",
    price: "$39,200",
    miles: "37k mi",
    source: "Autotrader",
    image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=700&q=80",
  },
];

function SpotrLogo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Spotr home">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-[#151827] text-[#ff7a1a] shadow-sm">
        <Car className="h-5 w-5" />
      </span>
      <span className="text-2xl font-black tracking-normal text-[#151827]">
        SPOT<span className="text-[#ff7a1a]">R</span>
      </span>
    </Link>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-20 max-w-6xl px-4">
      <div className="absolute -left-1 top-40 z-10 hidden rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/70 lg:flex">
        <MessageSquare className="mr-3 h-5 w-5 text-[#ff7a1a]" />
        <div>
          <p className="text-sm font-semibold text-[#151827]">New seller reply</p>
          <p className="text-xs text-slate-500">2019 Tacoma is ready for appraisal</p>
        </div>
      </div>

      <div className="absolute -right-2 top-52 z-10 hidden rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 lg:block">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#151827]">
          <Search className="h-4 w-4 text-[#ff7a1a]" />
          Market filters
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between text-xs text-slate-500">
              <span>$9,000</span>
              <span>$85,000</span>
            </div>
            <div className="h-1.5 w-56 rounded-full bg-slate-200">
              <div className="h-1.5 w-8/12 rounded-full bg-[#ff7a1a]" />
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs text-slate-500">
              <span>0 mi</span>
              <span>90k mi</span>
            </div>
            <div className="h-1.5 w-56 rounded-full bg-slate-200">
              <div className="h-1.5 w-7/12 rounded-full bg-[#ff7a1a]" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5 md:px-8">
          <div className="flex items-center gap-5">
            <div className="hidden text-xl font-black text-[#151827] sm:block">
              SPOT<span className="text-[#ff7a1a]">R</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-[#151827]">
              <Car className="h-4 w-4 text-[#ff7a1a]" />
              Fresh Listings
              <span className="rounded-full bg-[#151827] px-2 py-1 text-xs text-white">+86</span>
            </div>
            <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
              <CalendarDays className="h-4 w-4" />
              Appraisals
              <span className="rounded-full bg-[#151827] px-2 py-1 text-xs text-white">18</span>
            </div>
            <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex">
              <CircleDollarSign className="h-4 w-4" />
              Purchased
              <span className="rounded-full bg-[#151827] px-2 py-1 text-xs text-white">12</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <MapPin className="h-5 w-5" />
            <Bell className="h-5 w-5" />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#151827] text-sm font-bold text-white">
              SR
            </span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>

        <div className="grid gap-6 bg-[linear-gradient(135deg,#ffffff_0%,#fff7ed_45%,#f8fafc_100%)] p-5 md:grid-cols-[1fr_1.2fr_1fr] md:p-8">
          <div className="space-y-4">
            {previewListings.map(({ name, price, miles, source, image }) => (
              <div key={name} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 overflow-hidden rounded-md bg-slate-100">
                  <Image
                    src={image}
                    alt={`${name} private seller listing`}
                    width={700}
                    height={420}
                    className="h-24 w-full object-cover"
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#151827]">{name}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Gauge className="h-3 w-3" />
                      {miles} from {source}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#c2410c]">
                    {price}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/70">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-[#151827] px-3 py-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-[#ffb15f]" />
              AI ranked opportunity
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <Image
                src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80"
                alt="Black coupe listed by a private seller"
                width={1000}
                height={640}
                className="h-64 w-full object-cover object-center"
              />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                ["92", "Fit score"],
                ["6h", "Listed"],
                ["$2.8k", "Margin gap"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xl font-black text-[#151827]">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-[#151827]">Buyer tasks</p>
              {["Send range offer", "Book inspection", "Pull history report"].map((task, index) => (
                <div key={task} className="mb-3 flex items-center gap-3 last:mb-0">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-orange-50 text-[#ff7a1a]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-slate-600">{task}</span>
                  {index === 0 && (
                    <span className="ml-auto rounded-full bg-[#151827] px-2 py-1 text-[11px] font-bold text-white">
                      next
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 bg-[#151827] p-5 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-[#ffb15f]" />
                <div>
                  <p className="text-sm text-slate-300">Today&apos;s activity</p>
                  <p className="text-2xl font-black">41 sellers contacted</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-[#151827]">Pipeline health</p>
              <div className="mt-4 space-y-3">
                {[
                  ["New Leads", "78%"],
                  ["Contacted", "48%"],
                  ["Offer Made", "32%"],
                ].map(([stage, width]) => (
                  <div key={stage}>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{stage}</span>
                      <span>{width}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-[#ff7a1a]" style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-[#151827]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <SpotrLogo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="flex items-center gap-1 hover:text-[#c2410c]">
              {item}
              {item !== "How it Works" && <ChevronDown className="h-4 w-4" />}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-[#ff7a1a] bg-white px-5 py-3 text-sm font-bold text-[#151827] transition hover:bg-orange-50"
          >
            Login
          </Link>
          <Link
            href="/login"
            className="hidden rounded-lg bg-[#151827] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#252a3d] sm:inline-flex"
          >
            Get a Demo
          </Link>
        </div>
      </header>

      <section className="relative pt-24 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-80 max-w-4xl rounded-full bg-orange-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5">
          <div className="mx-auto inline-flex items-center rounded-full border border-[#ff7a1a] bg-white px-4 py-1.5 text-sm font-extrabold text-[#151827]">
            Private seller acquisition, built for modern dealerships
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-normal text-[#151827] sm:text-6xl lg:text-[4.75rem]">
            Buy better used cars from private sellers{" "}
            <span className="text-[#ff7a1a]">before the market sees them.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Spotr turns scattered listings and seller conversations into a focused acquisition workflow, helping your team source more inventory with less manual searching.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#151827] px-7 py-4 text-base font-extrabold text-white shadow-xl shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-[#252a3d]"
            >
              Get a Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-7 py-4 text-base font-extrabold text-[#151827] transition hover:border-[#ff7a1a] hover:bg-orange-50"
            >
              View Pipeline
            </Link>
          </div>
        </div>
        <ProductPreview />
      </section>

      <section id="company" className="mx-auto mt-24 max-w-7xl px-5 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-extrabold uppercase text-[#c2410c]">Trusted by growth-minded stores</p>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {logoCloud.map((logo) => (
              <div key={logo} className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-sm font-black text-slate-500 shadow-sm">
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto mt-28 max-w-7xl px-5 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#c2410c]">A sharper acquisition workflow</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal text-[#151827] sm:text-5xl">
              Stop searching manually. Start buying systematically.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Spotr gives private-party buying the same structure your sales team expects from a CRM, but tuned for inventory acquisition.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#ff7a1a] px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-orange-200 transition hover:bg-[#ea580c]"
            >
              Start sourcing smarter
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map(([value, label]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-4xl font-black text-[#151827]">{value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto mt-28 max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-extrabold uppercase text-[#c2410c]">AI-powered buying platform</p>
          <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Every lead, message, and deal in one place.</h2>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {workflow.map((item) => (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-7 grid h-12 w-12 place-items-center rounded-lg bg-orange-50 text-[#ff7a1a]">
                <item.icon className="h-6 w-6" />
              </div>
              <p className="text-xs font-extrabold uppercase text-[#c2410c]">{item.eyebrow}</p>
              <h3 className="mt-3 text-2xl font-black tracking-normal text-[#151827]">{item.title}</h3>
              <p className="mt-4 leading-7 text-slate-600">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="solutions" className="mx-auto mt-28 max-w-7xl px-5 lg:px-8">
        <div className="overflow-hidden rounded-lg bg-[#151827] text-white shadow-2xl shadow-slate-300">
          <div className="grid gap-8 p-8 lg:grid-cols-[1fr_0.9fr] lg:p-12">
            <div>
              <p className="text-sm font-extrabold uppercase text-[#ffb15f]">Built for the buying desk</p>
              <h2 className="mt-4 text-4xl font-black tracking-normal sm:text-5xl">
                Give one buyer the leverage of a full acquisition team.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Prioritized listings, seller messaging, appraisal tasks, and pipeline status all stay connected, so promising cars do not vanish into spreadsheets.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                [Users, "Assign buyers and track ownership"],
                [Mail, "Centralize seller conversations"],
                [TrendingUp, "Measure acquisition pipeline value"],
                [ShieldCheck, "Keep every deal step visible"],
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-[#ff7a1a]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-bold">{label as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="resources" className="mx-auto mt-28 max-w-7xl px-5 pb-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-extrabold uppercase text-[#c2410c]">FAQ</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">A clearer way to acquire cars.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              The demo account is already wired into the current Spotr app, so your team can move from this page directly into the working product.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm" open={question === "What does Spotr do?"}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-black text-[#151827]">
                  {question}
                  <ChevronDown className="h-5 w-5 text-[#ff7a1a] transition group-open:rotate-180" />
                </summary>
                <p className="mt-4 leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <SpotrLogo />
          <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-500">
            <a href="#product" className="hover:text-[#c2410c]">Product</a>
            <a href="#solutions" className="hover:text-[#c2410c]">Solutions</a>
            <a href="#resources" className="hover:text-[#c2410c]">Resources</a>
            <Link href="/login" className="hover:text-[#c2410c]">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
