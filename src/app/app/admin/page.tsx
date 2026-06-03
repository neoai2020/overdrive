import Link from "next/link";

const CARDS = [
  { href: "/app/admin/models",     title: "Models",     desc: "Pick which provider + model handles each pipeline task. Weighted A/B splits supported." },
  { href: "/app/admin/keys",       title: "Keys",       desc: "Add, rotate, and disable provider API keys. Stored AES-encrypted at rest." },
  { href: "/app/admin/test",       title: "A/B test",   desc: "Run one input through multiple variants. Compare outputs side-by-side." },
  { href: "/app/admin/presenters", title: "Presenters", desc: "Manage the UGC presenter roster. Used for identity consistency across shots." },
  { href: "/app/admin/runs",       title: "Runs",       desc: "Stream of generation_events. Filter by batch, ad, stage, or level." },
];

export default function AdminHome() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {CARDS.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="border rounded-lg p-5 hover:border-foreground/40 transition-colors"
        >
          <div className="font-medium">{c.title}</div>
          <div className="text-sm text-muted-foreground mt-1">{c.desc}</div>
        </Link>
      ))}
    </div>
  );
}
