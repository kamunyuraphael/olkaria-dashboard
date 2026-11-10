import { Link } from "react-router-dom";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <BrandMark size={32} />
      <span className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-tight">
        Olkaria Gas
        <span className="block text-[9.5px] font-semibold tracking-[0.12em] text-[var(--color-text-quaternary)] uppercase">
          Concentration Dashboard
        </span>
      </span>
    </Link>
  );
}

function Section({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-6 py-16 ${className}`}>
      <div className="max-w-5xl mx-auto">
        {eyebrow && (
          <p className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-2">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** Illustrated topographic map panel for the hero — an editorial touch
 * borrowed from the reference design, recolored to our teal theme tokens
 * rather than hardcoded hex so it re-themes with light/dark. */
function TopoArt() {
  return (
    <div className="relative w-full aspect-[4/5] max-h-[460px] rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox="0 0 740 650"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="var(--color-primary)" strokeWidth="1.3">
          <path d="M-30 165C84 50 178 111 261 63s169-43 240 44 154 70 250-14" />
          <path d="M-23 196c110-99 198-46 283-87s157-34 221 42 157 75 281-16" />
          <path d="M-42 233c117-88 211-34 298-71s145-19 203 47 167 81 294-17" />
          <path d="M-33 285c126-73 212-24 300-59s133 2 184 58 170 86 310-10" />
          <path d="M-37 348c133-57 221-15 306-49s111 23 156 69 173 93 326 0" />
          <path d="M-21 409c139-45 232-3 317-37s92 47 129 80 171 104 331 26" />
          <path d="M-17 482c150-34 245 4 327-25s70 61 106 91 164 101 332 42" />
          <path d="M64 109c29 48 35 89 12 139s-14 86 30 120 62 69 41 128" />
          <path d="M116 65c35 62 46 119 17 175s-8 102 40 140 66 79 39 147" />
          <path d="M510 61c-35 49-41 94-12 133s35 78 7 126-17 100 22 141 47 88 20 142" />
          <path d="M572 56c-42 53-47 101-17 144s40 80 10 135-21 98 17 142 53 94 25 144" />
        </g>
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-60" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-primary)]" />
        </span>
        <span className="text-[10px] font-semibold tracking-[0.15em] text-[var(--color-text-secondary)] uppercase">
          Olkaria I&ndash;V
        </span>
      </div>

      <div className="absolute top-5 left-5 font-mono text-[10.5px] text-[var(--color-text-tertiary)] leading-tight">
        00&deg;54&prime; S<br />
        036&deg;17&prime; E
      </div>

      <div className="absolute top-5 right-5 text-[9.5px] font-semibold tracking-[0.15em] text-[var(--color-text-quaternary)] uppercase text-right">
        01 / East African
        <br />
        Rift System
      </div>

      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
          <span className="w-5 h-px bg-[var(--color-text-quaternary)]" />
          5 KM
        </div>
        <div className="text-[10px] font-medium text-[var(--color-text-tertiary)] text-right leading-tight">
          GASES IN SCOPE
          <br />
          <span className="font-mono text-[var(--color-text-secondary)]">SO&#8322; &middot; CH&#8324; &middot; CO&#8322;</span>
        </div>
      </div>
    </div>
  );
}

export function LandingView() {
  return (
    <div className="min-h-full bg-[var(--color-surface)] overflow-y-auto">
      {/* Nav */}
      <header className="border-b border-[var(--color-border)] px-6 py-4 sticky top-0 bg-[var(--color-surface)]/95 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/request-access"
              className="px-4 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Request access
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-16 pb-16 border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
              Olkaria Geothermal Field &middot; Research Portal
            </p>
            <h1 className="text-[2.75rem] leading-[1.08] font-semibold text-[var(--color-text-primary)] tracking-tight">
              Reading the <em className="not-italic text-[var(--color-primary)] font-semibold">invisible</em> from
              above.
            </h1>
            <p className="mt-5 text-base text-[var(--color-text-tertiary)] leading-relaxed max-w-lg">
              A focused workspace for requesting and reviewing satellite-derived SO&#8322;, CH&#8324; and CO&#8322;
              forecasts, and AERMOD-style gas dispersion over Kenya's geothermal frontier &mdash; built to show what
              was actually measured, not invented.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                to="/request-access"
                className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Request researcher access
              </Link>
              <Link
                to="/login"
                className="px-5 py-2.5 border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--color-text-secondary)] text-sm font-semibold rounded-lg transition-colors"
              >
                Already have an account
              </Link>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-[var(--color-text-quaternary)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1l5 2v3.2c0 3.1-2.1 5.8-5 6.8-2.9-1-5-3.7-5-6.8V3l5-2z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              Restricted to approved research teams
            </div>
          </div>

          <TopoArt />
        </div>
      </section>

      {/* Intro strip */}
      <section className="px-6 py-10 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
          <span className="font-mono text-sm text-[var(--color-text-quaternary)] shrink-0">01&mdash;</span>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1">
            Geothermal energy is a defining part of Kenya's low-carbon future. Understanding its atmospheric
            footprint begins with honest, careful observation.
          </p>
          <span className="text-[10.5px] font-semibold tracking-wider text-[var(--color-text-quaternary)] uppercase text-right shrink-0">
            A research workspace
            <br />
            not an air-quality alert
          </span>
        </div>
      </section>

      {/* How it works */}
      <Section eyebrow="How it works" title="Three steps from coordinate to forecast" className="border-b border-[var(--color-border)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              n: "01",
              t: "Define the query",
              d: "Drop a pin or enter coordinates, set a buffer radius, choose SO₂, CH₄ or CO₂, and pick a date range — or upload source files for a dispersion run.",
            },
            {
              n: "02",
              t: "Pipeline runs",
              d: "Satellite and reanalysis data are retrieved, retrieval coverage is checked, and the ANN or AERMOD-style dispersion model is fitted.",
            },
            {
              n: "03",
              t: "Read the result",
              d: "Actual vs. predicted series, correlation matrix, RMSE/MAE/R², or spatial concentration maps and diurnal variation by receptor.",
            },
          ].map((s) => (
            <div key={s.n} className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl p-5">
              <span className="font-mono text-xs text-[var(--color-text-quaternary)]">{s.n}</span>
              <h3 className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{s.t}</h3>
              <p className="mt-1.5 text-sm text-[var(--color-text-tertiary)] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Methodology */}
      <Section eyebrow="Methodology" title="What the models are, and what they're measured against">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Data sources</h3>
            <ul className="space-y-2 text-sm text-[var(--color-text-tertiary)]">
              <li>Sentinel-5P / TROPOMI — SO₂ and CH₄ column retrievals</li>
              <li>ERA5-Land — meteorological covariates</li>
              <li>Retrieved via Google Earth Engine per query domain</li>
              <li>Uploaded emission-source and meteorology files for dispersion runs</li>
            </ul>
          </div>
          <div className="border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Models</h3>
            <ul className="space-y-2 text-sm text-[var(--color-text-tertiary)]">
              <li>LSTM-GRU neural network — satellite ANN forecasting</li>
              <li>AERMOD-style Gaussian plume dispersion — spatial concentration fields</li>
              <li>Metrics: RMSE, MAE, R², reported alongside a coverage and detection-floor check</li>
            </ul>
          </div>
        </div>
        <p className="mt-5 text-sm text-[var(--color-text-tertiary)] leading-relaxed max-w-3xl">
          Every satellite run reports a data coverage figure — the proportion of valid retrievals in the query
          domain — which determines whether the series is aggregated daily or weekly, and whether the result
          should be trusted at all.
        </p>
      </Section>

      {/* Limitations / research integrity */}
      <Section
        eyebrow="Research integrity"
        title="No invented measurements. Ever."
        className="bg-[var(--color-danger-subtle-alt)] border-y border-[var(--color-danger)]/20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="hidden lg:flex flex-col items-center justify-center w-28 h-28 rounded-2xl border-2 border-dashed border-[var(--color-danger)]/30 text-center shrink-0">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M14 2l10 4v6.4c0 6.2-4.2 11.6-10 13.6-5.8-2-10-7.4-10-13.6V6l10-4z"
                stroke="var(--color-danger)"
                strokeWidth="1.6"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="mt-1.5 text-[9px] font-semibold tracking-wider text-[var(--color-danger-text)] uppercase leading-tight">
              Research
              <br />
              integrity
            </span>
          </div>

          <div className="space-y-4 max-w-3xl">
            {[
              {
                t: "Detection floors are real",
                d: "At many sites the SO₂ signal sits below what TROPOMI can resolve. The tool flags this explicitly rather than returning a confident-looking but meaningless forecast.",
              },
              {
                t: "Coverage varies enormously by site",
                d: "Cloud cover, orbit geometry, and retrieval quality mean some locations yield too few valid observations to model at all.",
              },
              {
                t: "This is not real-time air quality",
                d: "Outputs are research forecasts from satellite column data and modelled dispersion fields, not ground-level exposure and not a public health alerting system.",
              },
            ].map((l) => (
              <div key={l.t} className="flex gap-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-1">
                  <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
                  <path d="M8 6v3.5" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11" r="0.75" fill="var(--color-danger)" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{l.t}</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-tertiary)] leading-relaxed">{l.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Access */}
      <Section eyebrow="Access" title="Requesting an account">
        <div className="max-w-3xl">
          <p className="text-sm text-[var(--color-text-tertiary)] leading-relaxed">
            Each analysis run retrieves satellite data and fits models on demand, so accounts are approved
            individually. Tell us your institution and what you plan to use the tool for, and you'll be
            notified once access is granted.
          </p>
          <Link
            to="/request-access"
            className="inline-block mt-6 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Request access
          </Link>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-text-quaternary)]">
            Built on ANN and AERMOD-style dispersion research for the Olkaria Geothermal Field.
          </p>
          <p className="text-xs text-[var(--color-text-quaternary)]">Sentinel-5P data © ESA / Copernicus</p>
        </div>
      </footer>
    </div>
  );
}
