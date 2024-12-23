import * as d3 from 'd3';

export const setupScales = (data: any[], width: number, height: number, margin: any) => {
  const keys = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
  
  const x = d3.scaleBand()
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .range([height - margin.bottom, margin.top]);

  x.domain(data.map((_, i) => i.toString()));
  y.domain([0, d3.max(data, d => d3.max(keys, key => d[key])) || 0]);

  return { x, y, keys };
};

export const createAxes = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, 
                         height: number, margin: any, x: d3.ScaleBand<string>, y: d3.ScaleLinear<number, number>) => {
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .attr('color', 'white');

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .attr('color', 'white');
};

export const createLegend = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, 
                           keys: string[], width: number, margin: any) => {
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
};