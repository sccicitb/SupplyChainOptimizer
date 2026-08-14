import React from "react";
import { ExternalLink, Database, Calculator, Route, MapPin } from "lucide-react";

// Setiap angka di antarmuka ini harus bisa menjawab "dari mana asalnya".
// Komponen ini memberi label asal-usul secara konsisten, sehingga data
// terukur tidak pernah tertukar dengan hasil estimasi model.

const VARIANTS = {
  osm: {
    label: "OpenStreetMap",
    icon: Database,
    className: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
    title: "Data nyata dari OpenStreetMap — klik untuk memverifikasi"
  },
  google: {
    label: "Google Maps",
    icon: MapPin,
    className: "bg-blue-500/10 border-blue-500/40 text-blue-300",
    title: "Data nyata dari Google Maps — klik untuk membuka tempatnya"
  },
  osrm: {
    label: "Jarak jalan OSRM",
    icon: Route,
    className: "bg-sky-500/10 border-sky-500/40 text-sky-300",
    title: "Jarak dihitung di atas jaringan jalan sungguhan"
  },
  haversine: {
    label: "Estimasi jarak",
    icon: Route,
    className: "bg-amber-500/10 border-amber-500/40 text-amber-300",
    title: "OSRM tidak tersedia; jarak diperkirakan dari garis lurus x1,3"
  },
  estimate: {
    label: "Estimasi model",
    icon: Calculator,
    className: "bg-amber-500/10 border-amber-500/40 text-amber-300",
    title: "Bukan penawaran pemasok — hasil model estimasi biaya"
  }
};

export default function SourceBadge({ variant, label, href, className = "" }) {
  const config = VARIANTS[variant] || VARIANTS.estimate;
  const Icon = config.icon;

  const content = (
    <>
      <Icon className="w-3 h-3 shrink-0" />
      <span>{label || config.label}</span>
      {href && <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />}
    </>
  );

  const base = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${config.className} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={config.title}
        className={`${base} hover:brightness-125 transition`}
      >
        {content}
      </a>
    );
  }

  return (
    <span title={config.title} className={base}>
      {content}
    </span>
  );
}

/** Panel yang menjelaskan mana data terukur dan mana hasil estimasi. */
export function DisclosurePanel({ disclosure }) {
  if (!disclosure) return null;

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/90 p-5 space-y-4 text-xs">
      <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
        <Database className="w-4 h-4 text-cyan-400" />
        Asal-usul Data
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Terukur & dapat diverifikasi
          </div>
          <ul className="space-y-1.5 text-slate-300">
            {disclosure.real.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-emerald-500 shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Estimasi model
          </div>
          <ul className="space-y-1.5 text-slate-300">
            {disclosure.estimated.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-amber-500 shrink-0">~</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
        {disclosure.caveat}
      </p>
    </div>
  );
}
