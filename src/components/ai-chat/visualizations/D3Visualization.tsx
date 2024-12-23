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

    const x = d3.scaleBand()
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .range([height - margin.bottom, margin.top]);

    const svg = d3.select(svgRef.current);

    // Sample data transformation
    const processedData = data.map((d, i) => ({
      label: d.label || `Item ${i}`,
      value: typeof d.value === 'number' ? d.value : i
    }));

    x.domain(processedData.map(d => d.label));
    y.domain([0, d3.max(processedData, d => d.value) || 0]);

    // Add bars
    svg.selectAll('rect')
      .data(processedData)
      .join('rect')
      .attr('x', d => x(d.label) || 0)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - margin.bottom - y(d.value))
      .attr('fill', '#6366f1')
      .attr('class', 'opacity-75 hover:opacity-100 transition-opacity');

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .attr('class', 'text-white');

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .attr('class', 'text-white');

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