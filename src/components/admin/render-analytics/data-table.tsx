export function DataTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[];
  rows: (string | number)[][];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-zinc-500">{emptyLabel}</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-100 text-zinc-800">
              {row.map((cell, j) => (
                <td key={j} className="max-w-[240px] truncate py-2 pr-3" title={String(cell)}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
