import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface QueryResultChartProps {
  data: any[];
}

export const QueryResultChart = ({ data }: QueryResultChartProps) => {
  if (!Array.isArray(data) || data.length === 0) return null;
  
  // Get the first item's keys for chart configuration
  const keys = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
  
  return (
    <div className="mt-4 h-64 w-full">
      <ChartContainer
        className="h-full"
        config={{
          data: {
            theme: {
              light: "#6366f1",
              dark: "#818cf8"
            }
          }
        }}
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={Object.keys(data[0])[0]} className="text-muted-foreground" />
          <YAxis className="text-muted-foreground" />
          <ChartTooltip 
            content={(props: any) => <ChartTooltipContent {...props} />}
          />
          {keys.map((key, index) => (
            <Bar 
              key={key} 
              dataKey={key} 
              fill={`hsl(${index * 40 + 200}, 70%, 50%)`} 
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
};