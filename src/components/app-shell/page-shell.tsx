import { cn } from "@/lib/utils";

/** Standard app page padding — matches overdrive-app-v2.html `.page` */
export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-[30px] py-[26px] pb-[70px] max-w-[1340px]", className)}>
      {children}
    </div>
  );
}
