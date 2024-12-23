import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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

    // Get numeric keys from data
    const keys = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
    
    // Create scales
    const x = d3.scaleBand()
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .range([height - margin.bottom, margin.top]);

    // Set domains
    x.domain(data.map((_, i) => i.toString()));
    y.domain([0, d3.max(data, d => d3.max(keys, key => d[key])) || 0]);

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

        // Add tooltip
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

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr('color', 'white');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .attr('color', 'white');

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - margin.right}, ${margin.top})`);

    keys.forEach((key, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', `hsl(${i * 40 + 200}, 70%, 50%)`);

      legendItem.append('text')
        .attr('x', 15)
        .attr('y', 9)
        .attr('fill', 'white')
        .style('font-size', '12px')
        .text(key);
    });

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