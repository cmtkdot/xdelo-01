import { useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface HighchartsVisualizationProps {
  data?: any[];
}

export const HighchartsVisualization = ({ data }: HighchartsVisualizationProps) => {
  const options = useMemo(() => ({
    chart: {
      type: 'line',
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'inherit'
      }
    },
    title: {
      text: 'Data Visualization',
      style: {
        color: '#fff'
      }
    },
    xAxis: {
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
    series: [{
      name: 'Data Points',
      data: data?.map(item => item.value) || [],
      color: '#6366f1'
    }],
    credits: {
      enabled: false
    },
    legend: {
      itemStyle: {
        color: '#fff'
      }
    }
  }), [data]);

  return (
    <div className="glass-card p-4">
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
      />
    </div>
  );
};