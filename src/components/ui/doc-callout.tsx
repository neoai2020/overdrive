import { cn } from "@/lib/utils";

interface DocCalloutProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

/** Matches prototype `.doc` — blue info tint. */
export function DocCallout({ title, children, className }: DocCalloutProps) {
  return (
    <div className={cn(
      "mb-5 flex gap-[9px] rounded-[10px] border border-[rgba(45,107,255,0.15)] bg-[rgba(45,107,255,0.05)] px-[14px] py-[11px] text-[12.5px] text-[#9db8ff]",
      className
    )}>
      <span className="shrink-0 opacity-80">ℹ️</span>
      <div>
        <b className="text-[#cdddff]">{title}</b>
        <div className="mt-0.5 leading-relaxed [&_strong]:text-[#cdddff]">{children}</div>
      </div>
    </div>
  );
}
