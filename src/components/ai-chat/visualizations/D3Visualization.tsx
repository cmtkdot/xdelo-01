import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { setupScales, createAxes, createLegend } from './utils/d3Utils';

interface D3VisualizationProps {
  data?: any[];
}

export const D3Visualization = ({ data }: D3VisualizationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const svg = d3.select(svgRef.current);
    const { x, y, keys } = setupScales(data, width, height, margin);

    // Add bars for each numeric key
    keys.forEach((key, keyIndex) => {
      const bars = svg.selectAll(`.bar-${key}`)
        .data(data)
        .join('rect')
        .attr('class', `bar-${key}`)
        .attr('x', (d, i) => (x(i.toString()) || 0) + (x.bandwidth() / keys.length) * keyIndex)
        .attr('y', d => y(d[key]))
        .attr('width', x.bandwidth() / keys.length)
        .attr('height', d => height - margin.bottom - y(d[key]))
        .attr('fill', `hsl(${keyIndex * 40 + 200}, 70%, 50%)`)
        .attr('opacity', 0.8);

      // Add hover effects
      bars.on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1);

        svg.append('text')
          .attr('class', 'tooltip')
          .attr('x', x(data.indexOf(d).toString()) || 0)
          .attr('y', y(d[key]) - 5)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .text(`${key}: ${d[key]}`);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);
        
        svg.selectAll('.tooltip').remove();
      });
    });

    createAxes(svg, height, margin, x, y);
    createLegend(svg, keys, width, margin);

  }, [data]);

  return (
    <div className="w-full h-64 glass-card p-4">
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox="0 0 600 300"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
};