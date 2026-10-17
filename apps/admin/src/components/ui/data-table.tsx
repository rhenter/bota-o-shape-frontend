import type { ReactNode } from "react";
export interface Column<T> {
  key: string;
  title: string;
  render: (item: T) => ReactNode;
}
export function DataTable<T extends { id: string }>({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
}) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${caption} · role para ver todas as colunas`}
    >
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
