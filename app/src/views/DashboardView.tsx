import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { NavRail } from "@/components/layout/NavRail";
import { OverviewView } from "@/views/OverviewView";
import { NewAnalysisView } from "@/views/NewAnalysisView";
import { DispersionView } from "@/views/DispersionView";
import { ResultsLibraryView } from "@/views/ResultsLibraryView";
import { SettingsView } from "@/views/SettingsView";
import type { Page } from "@/models/analysis.types";

const NAV_COLLAPSED_STORAGE_KEY = "olkaria:nav:collapsed";

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function DashboardView() {
  const [page, setPage] = useState<Page>("overview");
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // localStorage unavailable - collapse state just won't persist.
      }
      return next;
    });
  };

  return (
    <div className="h-full bg-[var(--color-bg)] font-sans flex flex-col overflow-hidden">
      <Header page={page} onOpenSettings={() => setPage("settings")} />

      <div className="flex flex-1 overflow-hidden">
        <NavRail page={page} onNavigate={setPage} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

        {page === "overview" && <OverviewView onNavigate={setPage} />}
        {page === "library" && <ResultsLibraryView onView={() => setPage("analysis")} />}
        {page === "settings" && <SettingsView />}
        {page === "analysis" && <NewAnalysisView />}
        {page === "dispersion" && <DispersionView />}
      </div>
    </div>
  );
}
