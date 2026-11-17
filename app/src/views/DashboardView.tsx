import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { NavRail, BottomNav } from "@/components/layout/NavRail";
import { RunBanner } from "@/components/layout/RunBanner";
import { LocationPrompt } from "@/components/layout/LocationPrompt";
import { OverviewView } from "@/views/OverviewView";
import { NewAnalysisView } from "@/views/NewAnalysisView";
import { DispersionView } from "@/views/DispersionView";
import { ResultsLibraryView } from "@/views/ResultsLibraryView";
import { AdminView } from "@/views/AdminView";
import { ForcePasswordChange } from "@/components/layout/PasswordFields";
import { SettingsView } from "@/views/SettingsView";
import { JobsProvider, useJobs } from "@/controllers/useJobs";
import type { Page } from "@/models/analysis.types";
import type { JobFilter, JobSummary } from "@/models/jobs.types";

const NAV_COLLAPSED_STORAGE_KEY = "olkaria:nav:collapsed";

// Tablets get the compact rail unless the user chose otherwise.
function getInitialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY);
    if (saved !== null) return saved === "1";
  } catch {
    /* ignore */
  }
  return typeof window !== "undefined" && window.innerWidth < 1100;
}

function Dashboard() {
  const { refresh } = useJobs();
  const [page, setPage] = useState<Page>("overview");
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed);
  const [filter, setFilter] = useState<JobFilter>("all");
  const [selected, setSelected] = useState<JobSummary | null>(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const navigate = (p: Page) => {
    if (p === "library") setSelected(null);
    setPage(p);
    void refresh();
  };
  const openResults = (f: JobFilter) => {
    setFilter(f);
    setSelected(null);
    setPage("library");
  };
  const openJob = (j: JobSummary) => {
    setSelected(j);
    setPage("library");
  };

  return (
    <div className="print-reset h-full bg-[var(--color-bg)] font-sans flex flex-col overflow-hidden">
      <Header page={page} onOpenSettings={() => setPage("settings")} onOpenJob={openJob} onSeeAll={() => openResults("all")} />

      <div className="print-reset flex flex-1 overflow-hidden min-h-0">
        <NavRail page={page} onNavigate={navigate} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

        <main className="print-reset flex-1 min-w-0 flex flex-col overflow-hidden">
          <RunBanner onOpenJob={openJob} onOpenResults={() => openResults("active")} />
          {page === "overview" && <OverviewView onNavigate={navigate} onOpenResults={openResults} />}
          {page === "dispersion" && <DispersionView onOpenResults={openResults} />}
          {page === "analysis" && <NewAnalysisView />}
          {page === "library" && (
            <ResultsLibraryView
              filter={filter}
              onFilterChange={setFilter}
              selected={selected}
              onSelect={setSelected}
              onNavigate={navigate}
            />
          )}
          {page === "settings" && <SettingsView />}
          {page === "admin" && <AdminView />}
        </main>
      </div>

      <BottomNav page={page} onNavigate={navigate} />
      <ForcePasswordChange />
      <LocationPrompt />
    </div>
  );
}

export function DashboardView() {
  return (
    <JobsProvider>
      <Dashboard />
    </JobsProvider>
  );
}
