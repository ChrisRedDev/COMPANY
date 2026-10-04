export const TABLE_COLUMNS = [
  { key: "name", label: "Firmy", className: "justify-start" },
  { key: "segment", label: "Segment i etap", className: "justify-start" },
  { key: "owner", label: "Opiekun firmy", className: "justify-start" },
  {
    key: "openDeals",
    label: "Otwarte szanse",
    className: "justify-end tabular-nums",
  },
  {
    key: "pipelineValue",
    label: "Wartość szans",
    className: "justify-end tabular-nums",
  },
  {
    key: "winProbability",
    label: "Szansa wygranej",
    className: "justify-end tabular-nums",
  },
  { key: "trend", label: "Trend aktywności", className: "justify-center" },
  {
    key: "lastInteraction",
    label: "Ostatni kontakt",
    className: "justify-start",
  },
  { key: "action", label: "Działanie", className: "justify-center" },
] as const;

export type TableColumnKey = (typeof TABLE_COLUMNS)[number]["key"];

export const TABLE_GRID_CLASS =
  "grid min-w-max grid-cols-[repeat(9,max-content)] justify-between";

export const TABLE_ROW_CLASS = "col-span-full grid grid-cols-subgrid";

export const TABLE_CELL_CLASS = "flex items-center";

export function columnClass(key: TableColumnKey) {
  return TABLE_COLUMNS.find((column) => column.key === key)?.className ?? "";
}
