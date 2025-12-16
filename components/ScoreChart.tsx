import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Sauna } from '../types';

interface ScoreChartProps {
  data: Sauna[];
}

const ScoreChart: React.FC<ScoreChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 300;
    const height = 60;
    const margin = { top: 5, right: 5, bottom: 20, left: 5 };

    const scores = data.map(d => d.pisteet).filter(s => s > 0);
    
    const x = d3.scaleLinear()
      .domain([d3.min(scores) || 0, d3.max(scores) || 50])
      .range([margin.left, width - margin.right]);

    const bins = d3.bin()
      .domain(x.domain() as [number, number])
      .thresholds(x.ticks(15))(scores);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length) || 0])
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("fill", "#d49763") // Wood-500 color
      .selectAll("rect")
      .data(bins)
      .join("rect")
        .attr("x", d => x(d.x0 || 0) + 1)
        .attr("width", d => Math.max(0, x(d.x1 || 0) - x(d.x0 || 0) - 1))
        .attr("y", d => y(d.length))
        .attr("height", d => y(0) - y(d.length))
        .attr("rx", 2); // Rounded corners

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))
      .attr("color", "#a5633e") // Wood-700
      .style("font-size", "8px");

  }, [data]);

  return (
    <div className="hidden sm:block p-4 bg-wood-50 rounded-lg border border-wood-200">
        <h4 className="text-xs font-semibold text-wood-800 mb-2 uppercase tracking-wider">Score Distribution (D3)</h4>
        <svg ref={svgRef} width={300} height={60} />
    </div>
  );
};

export default ScoreChart;