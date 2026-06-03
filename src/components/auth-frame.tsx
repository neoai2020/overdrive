import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AuthFrame({
  eyebrow, title, description, children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col p-8 lg:p-12">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[color:var(--color-acid)] inline-flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-display text-base tracking-tight">OVERDRIVE</span>
        </Link>

        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto">
            {eyebrow && (
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-acid)] font-semibold mb-3">{eyebrow}</div>
            )}
            <h1 className="font-display text-4xl leading-none">{title}</h1>
            {description && <p className="text-sm text-[color:var(--color-muted)] mt-3 leading-relaxed">{description}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <div className="text-[10px] text-[color:var(--color-faint)] uppercase tracking-wider">
          © Overdrive · More winners. More ROAS.
        </div>
      </div>

      {/* Right: marquee panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-[color:var(--color-panel)] border-l border-white/8 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(204,255,0,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,45,107,0.08),transparent_60%)]" />
        <div className="relative max-w-md">
          <div className="font-display text-5xl leading-[0.95] tracking-tight mb-6">
            50+ winning ads.<br />
            <span className="text-[color:var(--color-acid)]">One afternoon.</span>
          </div>
          <p className="text-[color:var(--color-muted)] text-base leading-relaxed">
            The creative engine for media buyers who refuse to wait on agencies. Brief once, generate in bulk, push to Meta in one click.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { k: "50+", v: "Ads per batch" },
              { k: "8 min", v: "Avg generation" },
              { k: "1×", v: "Click to push" },
            ].map((s) => (
              <div key={s.k}>
                <div className="font-display text-2xl text-[color:var(--color-acid)]">{s.k}</div>
                <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-faint)] mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
