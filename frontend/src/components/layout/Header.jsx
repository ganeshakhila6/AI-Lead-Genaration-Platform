import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitles = {
  "/sales": {
    eyebrow: "WORKSPACE",
    title: "Sales Dashboard",
    description: "Find, qualify, and review prospects in one place.",
  },
  "/monitoring": {
    eyebrow: "OUTREACH",
    title: "Monitoring Dashboard",
    description: "Track delivery and engagement for approved outreach.",
  },
};

export default function Header({ onOpenMobileMenu, apiConnected }) {
  const { pathname } = useLocation();
  const page = pageTitles[pathname] ?? pageTitles["/sales"];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Open navigation"
            onClick={onOpenMobileMenu}
            className="rounded-lg p-2 text-slate-600 hover:bg-canvas lg:hidden"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              {page.eyebrow}
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="text-[17px] font-semibold tracking-tight text-ink">
                {page.title}
              </h1>
              <span className="hidden text-xs text-muted md:inline">
                {page.description}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 sm:inline-flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiConnected === true
                  ? "bg-emerald-500"
                  : apiConnected === false
                    ? "bg-rose-500"
                    : "bg-amber-400"
              }`}
            />
            {apiConnected === true
              ? "API connected"
              : apiConnected === false
                ? "API not connected"
                : "Connecting to API…"}
          </span>
          <div
            aria-label="Workspace profile"
            className="flex items-center gap-2 py-1.5 pl-1.5 pr-1"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8eef9] text-xs font-semibold text-[#3d5f9b]">
              KS
            </span>
            <span className="hidden text-xs font-medium text-slate-700 sm:block">
              Workspace
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
