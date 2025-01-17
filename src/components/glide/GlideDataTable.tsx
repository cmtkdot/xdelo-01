import { useCallback, useMemo } from "react";
import {
  DataEditor,
  GridColumn,
  GridCell,
  Item,
  Theme,
  CompactSelection,
  EditableGridCell,
  GridCellKind,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";

interface GlideDataTableProps {
  data: any[];
  columns: string[];
  onCellEdited?: (cell: Item, newValue: EditableGridCell) => void;
}

export function GlideDataTable({ data, columns, onCellEdited }: GlideDataTableProps) {
  const getContent = useCallback(
    ([col, row]: Item): GridCell => {
      const columnName = columns[col];
      const value = data[row][columnName];
      
      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        readonly: false,
        displayData: String(value ?? ""),
        data: value,
      };
    },
    [data, columns]
  );

  const cols = useMemo(
    (): GridColumn[] =>
      columns.map((col) => ({
        title: col,
        width: 150,
      })),
    [columns]
  );

  const onCellEdit = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (onCellEdited) {
        onCellEdited(cell, newValue);
      }
    },
    [onCellEdited]
  );

  return (
    <DataEditor
      width="100%"
      height={600}
      rows={data.length}
      columns={cols}
      getCellContent={getContent}
      onCellEdited={onCellEdit}
      smoothScrollX
      smoothScrollY
      isDraggable={false}
      rowMarkers="number"
      getCellsForSelection={true}
      theme={{
        accentColor: "rgb(62, 166, 255)",
        accentLight: "rgba(62, 166, 255, 0.2)",
      }}
    />
  );
}