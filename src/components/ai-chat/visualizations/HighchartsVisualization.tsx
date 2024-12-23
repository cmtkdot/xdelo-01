import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface HighchartsVisualizationProps {
  data?: any[];
}

export const HighchartsVisualization = ({ data }: HighchartsVisualizationProps) => {
  const options = useMemo(() => {
    if (!data || data.length === 0) return {};

    const keys = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
    const categories = data.map((_, index) => `Item ${index + 1}`);

    return {
      chart: {
        type: 'column',
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'inherit'
        },
        options3d: {
          enabled: true,
          alpha: 15,
          beta: 15,
          depth: 50,
          viewDistance: 25
        }
      },
      title: {
        text: 'Data Visualization',
        style: {
          color: '#fff'
        }
      },
      xAxis: {
        categories,
        labels: {
          style: {
            color: '#fff'
          }
        }
      },
      yAxis: {
        title: {
          text: 'Values',
          style: {
            color: '#fff'
          }
        },
        labels: {
          style: {
            color: '#fff'
          }
        }
      },
      plotOptions: {
        column: {
          depth: 25,
          colorByPoint: false
        }
      },
      series: keys.map((key, index) => ({
        name: key,
        data: data.map(item => item[key]),
        color: `hsl(${index * 40 + 200}, 70%, 50%)`
      })),
      credits: {
        enabled: false
      },
      legend: {
        itemStyle: {
          color: '#fff'
        }
      },
      tooltip: {
        headerFormat: '<b>{point.x}</b><br/>',
        pointFormat: '{series.name}: {point.y}'
      }
    };
  }, [data]);

  return (
    <div className="glass-card p-4">
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
      />
    </div>
  );
};