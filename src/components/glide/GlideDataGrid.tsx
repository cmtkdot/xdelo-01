import { useCallback, useMemo } from "react";
import {
  DataEditor,
  GridColumn,
  GridCell,
  Item,
  EditableGridCell,
  GridCellKind,
} from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface GlideDataGridProps {
  data: any[];
  columns: string[];
  onCellEdited?: (cell: Item, newValue: EditableGridCell) => void;
  onRowDelete?: (rowIndex: number) => void;
}

export function GlideDataGrid({ 
  data, 
  columns, 
  onCellEdited,
  onRowDelete 
}: GlideDataGridProps) {
  const getContent = useCallback(
    ([col, row]: Item): GridCell => {
      const columnName = columns[col];
      const value = data[row][columnName];
      
      if (columnName === "actions") {
        return {
          kind: GridCellKind.Custom,
          allowOverlay: true,
          readonly: false,
          copyData: "",
          data: {
            kind: "button-cell",
            onClick: () => onRowDelete?.(row),
            icon: <Trash2 className="h-4 w-4" />,
          },
        };
      }

      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        readonly: false,
        displayData: String(value ?? ""),
        data: value,
      };
    },
    [data, columns, onRowDelete]
  );

  const cols = useMemo(
    (): GridColumn[] => [
      ...columns.map((col) => ({
        title: col,
        width: 150,
      })),
      {
        title: "Actions",
        width: 100,
      },
    ],
    [columns]
  );

  return (
    <DataEditor
      width="100%"
      height={600}
      rows={data.length}
      columns={cols}
      getCellContent={getContent}
      onCellEdited={onCellEdited}
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