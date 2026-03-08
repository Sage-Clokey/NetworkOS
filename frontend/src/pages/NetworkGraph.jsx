import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getGraph } from '../services/api';

const TYPE_COLOR = {
  user: '#2563eb',
  event: '#7c3aed',
  contact: '#059669',
  tag: '#d97706',
};

const TYPE_RADIUS = {
  user: 18,
  event: 14,
  contact: 10,
  tag: 8,
};

export default function NetworkGraph() {
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    getGraph()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const W = container.clientWidth || 800;
    const H = Math.max(500, container.clientHeight || 600);

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom
    svg.call(
      d3.zoom()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.links.map(l => ({ ...l }));

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => TYPE_RADIUS[d.type] + 10));

    const link = g.append('g')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1.5)
      .selectAll('line')
      .data(links)
      .join('line');

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    node.append('circle')
      .attr('r', d => TYPE_RADIUS[d.type] || 10)
      .attr('fill', d => TYPE_COLOR[d.type] || '#64748b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mouseover', (event, d) => {
        setTooltip({ x: event.clientX, y: event.clientY, node: d });
      })
      .on('mousemove', (event, d) => {
        setTooltip({ x: event.clientX, y: event.clientY, node: d });
      })
      .on('mouseout', () => setTooltip(null));

    node.append('text')
      .attr('dy', d => TYPE_RADIUS[d.type] + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .text(d => d.label.length > 18 ? d.label.slice(0, 16) + '…' : d.label);

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [data]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Network Graph</h1>
        <div className="flex gap-3 text-xs text-gray-500">
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden relative" style={{ height: '70vh' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">Loading graph...</div>
        )}
        {!loading && data?.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            Add contacts to see your network graph.
          </div>
        )}
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <p className="font-semibold">{tooltip.node.label}</p>
          <p className="text-gray-300 capitalize">{tooltip.node.type}</p>
          {tooltip.node.organization && <p className="text-gray-400">{tooltip.node.organization}</p>}
          {tooltip.node.role && <p className="text-gray-400">{tooltip.node.role}</p>}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center">
        Drag nodes to reposition. Scroll to zoom. Click and drag canvas to pan.
      </p>
    </div>
  );
}
