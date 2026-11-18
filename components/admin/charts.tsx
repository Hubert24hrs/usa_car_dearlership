import { formatNumber } from "@/lib/format";

/**
 * Minimal single-series charts for the admin dashboard.
 * One hue (--chart-1) encodes magnitude; text stays in text tokens; every bar
 * has a hover tooltip; an equivalent table is provided for screen readers.
 */

export function BarList({ title, rows, unit = "" }: { title: string; rows: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="rounded-2xl border bg-card p-5">
      <figcaption className="mb-4 text-sm font-semibold">{title}</figcaption>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <table className="w-full border-separate border-spacing-y-1.5 text-sm">
          <caption className="sr-only">{title}</caption>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="group" title={`${row.label}: ${formatNumber(row.value)}${unit}`}>
                <th scope="row" className="w-40 truncate pr-3 text-left font-normal text-muted-foreground">
                  {row.label}
                </th>
                <td className="w-full">
                  <div className="h-3 rounded-r-[4px] bg-chart-1 transition-opacity group-hover:opacity-80" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
                </td>
                <td className="pl-3 text-right tabular-nums font-medium">
                  {formatNumber(row.value)}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}

export function DailyColumns({ title, days }: { title: string; days: { date: string; value: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <figure className="rounded-2xl border bg-card p-5">
      <figcaption className="mb-4 text-sm font-semibold">{title}</figcaption>
      <div className="relative flex h-40 items-end gap-[2px] border-b border-border" aria-hidden="true">
        {days.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }} />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block">
              {d.date}: {formatNumber(d.value)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
