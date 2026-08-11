import { useId } from 'react';
import { generateSummary } from "@/lib/utils/generateSummary";

export default function BarChart({
  data,
  title = "Bar chart",
  xLabel = "Year",
  yLabel = "Value",
}) {
  const uid = useId();
  const titleId   = `${uid}-chart-title`;
  const summaryId = `${uid}-chart-summary`;

  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const summary = generateSummary({ data, title, xLabel, yLabel });

  return (
    <div>
      <h2 id={titleId} className="sr-only">
        {title}
      </h2>

      <p id={summaryId} className="sr-only">
        {summary}
      </p>

      <div
        role="img"
        aria-labelledby={titleId}
        aria-describedby={summaryId}
        tabIndex={0}
        className="flex items-end gap-4 h-48 border rounded-xl p-6"
      >
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center h-full">
            <div
              className="w-10 bg-blue-700 rounded"
              style={{ height: `${(d.value / max) * 100}%` }}
              aria-hidden="true"
            />
            <div className="text-xs mt-2 text-gray-600" aria-hidden="true">
              {d.year}
            </div>
          </div>
        ))}
      </div>

      {/* Accessible table for screen reader traversal */}
      <table className="sr-only">
        <caption>{title} — data table</caption>
        <thead>
          <tr>
            <th scope="col">{xLabel}</th>
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <th scope="row">{d.year}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
