import type { Page } from "@/models/analysis.types";
import { useAuth } from "@/controllers/useAuth";
import { BrandMark } from "@/components/ui/BrandMark";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { IconOverview, IconAnalysis, IconLibrary, IconDispersion, IconSettings } from "@/components/layout/NavIcons";

interface NavItem {
  id: Page;
  label: string;
  caption: string;
  icon: React.ReactNode;
}

// Order matters: Gas dispersion comes before ANN.
export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", caption: "Your workspace", icon: <IconOverview /> },
  { id: "dispersion", label: "Gas dispersion", caption: "Upload data, map the spread", icon: <IconDispersion /> },
  { id: "analysis", label: "ANN", caption: "Satellite or your own data", icon: <IconAnalysis /> },
  { id: "library", label: "Results", caption: "Your saved runs", icon: <IconLibrary /> },
];

export const ADMIN_ITEM: NavItem = {
  id: "admin",
  label: "Admin",
  caption: "Users & requests",
  icon: <IconSettings />,
};

export const SETTINGS_ITEM: NavItem = {
  id: "settings",
  label: "Settings",
  caption: "Profile & location",
  icon: <IconSettings />,
};

function IconCollapse({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`transition-transform ${collapsed ? "rotate-180" : ""}`}>
      <path d="M9 2.5L4.5 7l4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NavButton({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate: (p: Page) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(item.id)}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={`relative w-full flex items-center rounded-lg text-left transition-colors cursor-pointer ${
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 pl-3.5 pr-3 py-2.5"
      } ${
        isActive
          ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
          : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text-secondary)]"
      }`}
    >
      {isActive && <span className="absolute top-1/2 -translate-y-1/2 left-0 w-[3px] h-5 bg-[var(--color-primary)] rounded-r" />}
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-tight truncate">{item.label}</span>
          <span
            className={`block text-[10.5px] leading-tight truncate mt-0.5 ${
              isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-quaternary)]"
            }`}
          >
            {item.caption}
          </span>
        </span>
      )}
    </button>
  );
}

/** Desktop / tablet side rail. Hidden on phones, where <BottomNav/> takes over. */
export function NavRail({
  page,
  onNavigate,
  collapsed,
  onToggleCollapsed,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const { user, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "";

  return (
    <nav
      className={`hidden md:flex shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-col py-5 overflow-hidden transition-[width] duration-200 ${
        collapsed ? "w-[68px]" : "w-[220px]"
      }`}
    >
      <div className={`flex items-center mb-4 ${collapsed ? "flex-col gap-3 px-0" : "justify-between px-4"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark size={22} />
            <div className="min-w-0 leading-tight">
              <p className="text-[12.5px] font-semibold text-[var(--color-text-primary)] truncate">{BRAND_NAME}</p>
              <p className="text-[9px] font-semibold tracking-wider text-[var(--color-text-quaternary)] uppercase truncate">
                {BRAND_TAGLINE}
              </p>
            </div>
          </div>
        )}
        {collapsed && <BrandMark size={22} />}
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
        >
          <IconCollapse collapsed={collapsed} />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-3 flex-1">
        {NAV_ITEMS.map((item) => (
          <NavButton key={item.id} item={item} isActive={item.id === page} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="px-3 mt-2 flex flex-col gap-1">
        {user?.role === "admin" && (
          <NavButton item={ADMIN_ITEM} isActive={page === "admin"} collapsed={collapsed} onNavigate={onNavigate} />
        )}
        <NavButton item={SETTINGS_ITEM} isActive={page === "settings"} collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <div className={`mt-4 pt-4 border-t border-[var(--color-border)] ${collapsed ? "px-2" : "px-3"}`}>
        {user && (
          <button
            onClick={() => onNavigate("settings")}
            className={`w-full flex items-center mb-2 cursor-pointer ${collapsed ? "justify-center" : "gap-2.5 px-1 text-left"}`}
            title={collapsed ? `${user.name} · ${user.email}` : undefined}
          >
            <span className="w-6 h-6 rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)] text-[10px] font-semibold flex items-center justify-center shrink-0">
              {initials}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] leading-tight truncate">{user.name}</span>
                <span className="block text-[10.5px] text-[var(--color-text-quaternary)] leading-tight truncate mt-0.5">
                  {user.defaultLocation
                    ? user.defaultLocation.label || `${user.defaultLocation.latitude.toFixed(2)}°, ${user.defaultLocation.longitude.toFixed(2)}°`
                    : "No default location"}
                </span>
              </span>
            )}
          </button>
        )}

        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className={`w-full flex items-center py-1.5 rounded-lg text-[12px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors cursor-pointer ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-1"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M5.5 1.5H2.5a1 1 0 00-1 1v9a1 1 0 001 1h3M9.5 10l3-3-3-3M12.5 7h-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && "Sign out"}
        </button>
      </div>
    </nav>
  );
}

/** Phone navigation: a fixed bottom tab bar with large tap targets. */
export function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  const { user } = useAuth();
  const items = user?.role === "admin" ? [...NAV_ITEMS, ADMIN_ITEM, SETTINGS_ITEM] : [...NAV_ITEMS, SETTINGS_ITEM];
  return (
    <nav className="md:hidden shrink-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
        const active = item.id === page;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] cursor-pointer transition-colors ${
              active ? "text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium leading-tight">{item.id === "dispersion" ? "Dispersion" : item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
