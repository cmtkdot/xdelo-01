import { useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ThreeDVisualization, D3Visualization, HighchartsVisualization } from './visualizations';
import { Button } from "@/components/ui/button";
import { Cube, BarChart as BarChartIcon, LineChart } from 'lucide-react';

interface QueryResultChartProps {
  data: any[];
}

export const QueryResultChart = ({ data }: QueryResultChartProps) => {
  const [visualizationType, setVisualizationType] = useState<'recharts' | 'three' | 'd3' | 'highcharts'>('recharts');
  
  if (!Array.isArray(data) || data.length === 0) return null;
  
  const keys = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
  
  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <Button
          variant={visualizationType === 'recharts' ? 'default' : 'outline'}
          onClick={() => setVisualizationType('recharts')}
          className="glass-button"
        >
          <BarChartIcon className="w-4 h-4 mr-2" />
          Recharts
        </Button>
        <Button
          variant={visualizationType === 'three' ? 'default' : 'outline'}
          onClick={() => setVisualizationType('three')}
          className="glass-button"
        >
          <Cube className="w-4 h-4 mr-2" />
          3D
        </Button>
        <Button
          variant={visualizationType === 'd3' ? 'default' : 'outline'}
          onClick={() => setVisualizationType('d3')}
          className="glass-button"
        >
          <BarChartIcon className="w-4 h-4 mr-2" />
          D3
        </Button>
        <Button
          variant={visualizationType === 'highcharts' ? 'default' : 'outline'}
          onClick={() => setVisualizationType('highcharts')}
          className="glass-button"
        >
          <LineChart className="w-4 h-4 mr-2" />
          Highcharts
        </Button>
      </div>

      {visualizationType === 'recharts' && (
        <div className="h-64 w-full">
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
      )}

      {visualizationType === 'three' && (
        <ThreeDVisualization data={data} />
      )}

      {visualizationType === 'd3' && (
        <D3Visualization data={data} />
      )}

      {visualizationType === 'highcharts' && (
        <HighchartsVisualization data={data} />
      )}
    </div>
  );
};