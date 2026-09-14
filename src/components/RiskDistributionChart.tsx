import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, 
  Activity, 
  Layers, 
  Percent, 
  Hash, 
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { CaseRecord } from '../types';

interface RiskDistributionChartProps {
  cases: CaseRecord[];
}

type ChartMode = 'percentage' | 'count' | 'trajectory';

interface ProcessedDataPoint {
  index: number;
  caseId: string;
  drug: string;
  timestamp: Date;
  timeLabel: string;
  riskCategory: string;
  probability: number;
  // Cumulative metrics
  highCount: number;
  modCount: number;
  lowCount: number;
  totalCount: number;
  highPct: number;
  modPct: number;
  lowPct: number;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ cases }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 280 });
  const [mode, setMode] = useState<ChartMode>('percentage');
  const [visibleLines, setVisibleLines] = useState<{ high: boolean; moderate: boolean; low: boolean }>({
    high: true,
    moderate: true,
    low: true,
  });
  const [hoveredPoint, setHoveredPoint] = useState<ProcessedDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // ResizeObserver for responsive SVG canvas sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          // Keep a balanced aspect ratio (between 260px and 340px high)
          const calcHeight = Math.min(Math.max(width * 0.42, 260), 320);
          setDimensions({ width, height: calcHeight });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Process and sort cases chronologically
  const processedData: ProcessedDataPoint[] = useMemo(() => {
    if (!cases || cases.length === 0) return [];

    // Sort ascending by timestamp
    const sorted = [...cases].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });

    let runningHigh = 0;
    let runningMod = 0;
    let runningLow = 0;

    return sorted.map((c, idx) => {
      const category = (c.risk_category || '').toUpperCase();
      if (category.includes('HIGH')) {
        runningHigh++;
      } else if (category.includes('MOD') || category.includes('MEDIUM')) {
        runningMod++;
      } else {
        runningLow++;
      }

      const total = idx + 1;
      const rawDate = new Date(c.timestamp || Date.now());
      const dateValid = !isNaN(rawDate.getTime()) ? rawDate : new Date();

      return {
        index: idx,
        caseId: c.case_id || `Case-${idx + 1}`,
        drug: c.extracted_data?.drug || 'Unknown Drug',
        timestamp: dateValid,
        timeLabel: dateValid.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        riskCategory: category || 'LOW RISK',
        probability: Math.round((c.ml_risk_probability ?? 0) * 100),
        highCount: runningHigh,
        modCount: runningMod,
        lowCount: runningLow,
        totalCount: total,
        highPct: Math.round((runningHigh / total) * 100),
        modPct: Math.round((runningMod / total) * 100),
        lowPct: Math.round((runningLow / total) * 100),
      };
    });
  }, [cases]);

  // Overall aggregate stats
  const aggregateStats = useMemo(() => {
    if (processedData.length === 0) {
      return { total: 0, highPct: 0, modPct: 0, lowPct: 0, avgScore: 0 };
    }
    const last = processedData[processedData.length - 1];
    const avgScore = Math.round(
      processedData.reduce((acc, p) => acc + p.probability, 0) / processedData.length
    );
    return {
      total: last.totalCount,
      highPct: last.highPct,
      modPct: last.modPct,
      lowPct: last.lowPct,
      avgScore,
    };
  }, [processedData]);

  // D3 Chart Rendering
  useEffect(() => {
    if (!svgRef.current || processedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 24, right: 30, bottom: 44, left: 48 };
    const innerWidth = Math.max(width - margin.left - margin.right, 50);
    const innerHeight = Math.max(height - margin.top - margin.bottom, 50);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color definitions
    const colors = {
      high: '#ef4444',     // red-500
      highArea: '#ef4444',
      moderate: '#f59e0b', // amber-500
      moderateArea: '#f59e0b',
      low: '#10b981',      // emerald-500
      lowArea: '#10b981',
      grid: 'currentColor',
    };

    // Defs for gradients
    const defs = svg.append('defs');

    // Gradient helper
    const createGradient = (id: string, color: string) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.28);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.0);
    };

    createGradient('highGrad', colors.high);
    createGradient('modGrad', colors.moderate);
    createGradient('lowGrad', colors.low);

    // Scales
    // For x scale, use index scale with nice spacing or time scale
    const xScale = d3
      .scalePoint<number>()
      .domain(processedData.map((d) => d.index))
      .range([0, innerWidth])
      .padding(0.1);

    let yScale: d3.ScaleLinear<number, number>;
    if (mode === 'percentage') {
      yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]).nice();
    } else if (mode === 'count') {
      const maxCount = d3.max(processedData, (d) => Math.max(d.highCount, d.modCount, d.lowCount)) || 5;
      yScale = d3.scaleLinear().domain([0, Math.max(maxCount, 4)]).range([innerHeight, 0]).nice();
    } else {
      yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]).nice();
    }

    // Grid lines (horizontal)
    const yTicks = mode === 'count' ? Math.min(5, Math.max(3, yScale.domain()[1])) : 5;
    const yAxisGrid = d3
      .axisLeft(yScale)
      .ticks(yTicks)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'y-grid text-slate-200 dark:text-slate-800/70')
      .style('stroke-dasharray', '3,3')
      .style('stroke-opacity', 0.8)
      .call(yAxisGrid)
      .select('.domain')
      .remove();

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(
        // Avoid crowded ticks if data is dense
        processedData
          .map((d) => d.index)
          .filter((_, idx, arr) => {
            if (arr.length <= 6) return true;
            const step = Math.ceil(arr.length / 5);
            return idx % step === 0 || idx === arr.length - 1;
          })
      )
      .tickFormat((d) => {
        const pt = processedData.find((p) => p.index === d);
        if (!pt) return '';
        return pt.timeLabel;
      });

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(yTicks)
      .tickFormat((d) => {
        if (mode === 'percentage' || mode === 'trajectory') {
          return `${d}%`;
        }
        return `${d}`;
      });

    // Draw X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('class', 'x-axis text-[11px] font-mono text-slate-500 dark:text-slate-400')
      .call(xAxis)
      .selectAll('text')
      .attr('dy', '1.2em')
      .style('fill', 'currentColor');

    g.selectAll('.x-axis path, .x-axis line')
      .attr('stroke', 'currentColor')
      .attr('class', 'text-slate-200 dark:text-slate-800');

    // Draw Y Axis
    g.append('g')
      .attr('class', 'y-axis text-[11px] font-mono text-slate-500 dark:text-slate-400')
      .call(yAxis)
      .selectAll('text')
      .style('fill', 'currentColor');

    g.selectAll('.y-axis path, .y-axis line')
      .attr('stroke', 'currentColor')
      .attr('class', 'text-slate-200 dark:text-slate-800');

    // In Trajectory Mode: render threshold bands
    if (mode === 'trajectory') {
      // High threshold (>=70%)
      const y70 = yScale(70);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', y70)
        .attr('y2', y70)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.5);

      g.append('text')
        .attr('x', innerWidth - 4)
        .attr('y', y70 - 4)
        .attr('text-anchor', 'end')
        .attr('class', 'text-[10px] font-mono fill-red-500')
        .text('High Threshold (≥70%)');

      // Moderate threshold (30%)
      const y30 = yScale(30);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', y30)
        .attr('y2', y30)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.5);

      g.append('text')
        .attr('x', innerWidth - 4)
        .attr('y', y30 - 4)
        .attr('text-anchor', 'end')
        .attr('class', 'text-[10px] font-mono fill-amber-500')
        .text('Mod Threshold (30%)');
    }

    // Line and Area Generators
    const createLinePath = (
      valAccessor: (d: ProcessedDataPoint) => number,
      color: string,
      areaGradId?: string
    ) => {
      const lineGen = d3
        .line<ProcessedDataPoint>()
        .x((d) => xScale(d.index) ?? 0)
        .y((d) => yScale(valAccessor(d)))
        .curve(processedData.length > 2 ? d3.curveMonotoneX : d3.curveLinear);

      // Area fill
      if (areaGradId) {
        const areaGen = d3
          .area<ProcessedDataPoint>()
          .x((d) => xScale(d.index) ?? 0)
          .y0(innerHeight)
          .y1((d) => yScale(valAccessor(d)))
          .curve(processedData.length > 2 ? d3.curveMonotoneX : d3.curveLinear);

        g.append('path')
          .datum(processedData)
          .attr('fill', `url(#${areaGradId})`)
          .attr('d', areaGen);
      }

      // Stroke line
      const path = g
        .append('path')
        .datum(processedData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('d', lineGen);

      // Animated drawing effect
      const totalLength = path.node()?.getTotalLength() || 0;
      if (totalLength > 0) {
        path
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(750)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0);
      }

      // Dots on points
      g.selectAll(`.dot-${color.replace('#', '')}`)
        .data(processedData)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.index) ?? 0)
        .attr('cy', (d) => yScale(valAccessor(d)))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .attr('class', 'transition-transform duration-150');
    };

    if (mode === 'percentage') {
      if (visibleLines.high) {
        createLinePath((d) => d.highPct, colors.high, 'highGrad');
      }
      if (visibleLines.moderate) {
        createLinePath((d) => d.modPct, colors.moderate, 'modGrad');
      }
      if (visibleLines.low) {
        createLinePath((d) => d.lowPct, colors.low, 'lowGrad');
      }
    } else if (mode === 'count') {
      if (visibleLines.high) {
        createLinePath((d) => d.highCount, colors.high, 'highGrad');
      }
      if (visibleLines.moderate) {
        createLinePath((d) => d.modCount, colors.moderate, 'modGrad');
      }
      if (visibleLines.low) {
        createLinePath((d) => d.lowCount, colors.low, 'lowGrad');
      }
    } else {
      // Trajectory mode: risk probability of each case
      createLinePath((d) => d.probability, '#0ea5e9', undefined);

      // Custom color circles based on individual risk
      g.selectAll('.dot-trajectory')
        .data(processedData)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.index) ?? 0)
        .attr('cy', (d) => yScale(d.probability))
        .attr('r', 5)
        .attr('fill', (d) => {
          if (d.riskCategory.includes('HIGH')) return colors.high;
          if (d.riskCategory.includes('MOD')) return colors.moderate;
          return colors.low;
        })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2);
    }

    // Hover Guideline
    const guideline = g
      .append('line')
      .attr('class', 'guideline')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'currentColor')
      .attr('class', 'text-slate-400 dark:text-slate-500')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    // Interactive Overlay for Tooltip Tracking
    const overlay = g
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay
      .on('mousemove', (event: MouseEvent) => {
        const [pointerX] = d3.pointer(event);
        // Find closest data point based on xScale
        let closestPoint = processedData[0];
        let minDistance = Infinity;

        processedData.forEach((d) => {
          const ptX = xScale(d.index) ?? 0;
          const dist = Math.abs(ptX - pointerX);
          if (dist < minDistance) {
            minDistance = dist;
            closestPoint = d;
          }
        });

        if (closestPoint) {
          const ptX = xScale(closestPoint.index) ?? 0;
          guideline.attr('x1', ptX).attr('x2', ptX).style('opacity', 1);

          setHoveredPoint(closestPoint);
          setTooltipPos({
            x: margin.left + ptX,
            y: event.offsetY,
          });
        }
      })
      .on('mouseleave', () => {
        guideline.style('opacity', 0);
        setHoveredPoint(null);
        setTooltipPos(null);
      });

  }, [processedData, dimensions, mode, visibleLines]);

  if (!cases || cases.length === 0) {
    return (
      <div className="p-8 text-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
        <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Temporal Distribution Engine Awaiting Data
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Submit clinical notes in the Analyze tab to generate longitudinal risk trajectory trends with interactive D3.js line metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="ios-glass ios-specular rounded-3xl border border-white/70 dark:border-white/10 p-5 sm:p-6 shadow-md space-y-5 transition-all">
      {/* Header & Metric KPIs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Temporal Risk Category Distribution
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/10">
              D3.js v7
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Longitudinal trend of pharmacovigilance safety classifications across case intake timeline.
          </p>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl ios-glass-card border border-white/70 dark:border-white/10 flex items-center gap-1.5 shadow-2xs">
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">Total Cases:</span>
            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
              {aggregateStats.total}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-1.5 text-red-700 dark:text-red-300 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-[11px] font-medium">High:</span>
            <span className="font-bold font-mono">{aggregateStats.highPct}%</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5 text-amber-700 dark:text-amber-300 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-medium">Mod:</span>
            <span className="font-bold font-mono">{aggregateStats.modPct}%</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-medium">Low:</span>
            <span className="font-bold font-mono">{aggregateStats.lowPct}%</span>
          </div>
        </div>
      </div>

      {/* Control Strip & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/50 dark:border-white/10 text-xs">
        {/* View Mode Toggle Buttons */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/70 dark:border-white/10 self-start shadow-xs">
          <button
            onClick={() => setMode('percentage')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'percentage'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs ios-specular'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-teal-500" />
            <span>Distribution Share (%)</span>
          </button>

          <button
            onClick={() => setMode('count')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'count'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs ios-specular'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cumulative Volume (n)</span>
          </button>

          <button
            onClick={() => setMode('trajectory')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'trajectory'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs ios-specular'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-500" />
            <span>Case ML Scores</span>
          </button>
        </div>

        {/* Legend with interactive toggles */}
        {mode !== 'trajectory' ? (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Series:</span>
            
            <button
              onClick={() => setVisibleLines((prev) => ({ ...prev, high: !prev.high }))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                visibleLines.high
                  ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
              }`}
            >
              <span className="w-2.5 h-1 rounded bg-red-500"></span>
              <span>High Risk</span>
            </button>

            <button
              onClick={() => setVisibleLines((prev) => ({ ...prev, moderate: !prev.moderate }))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                visibleLines.moderate
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
              }`}
            >
              <span className="w-2.5 h-1 rounded bg-amber-500"></span>
              <span>Mod Risk</span>
            </button>

            <button
              onClick={() => setVisibleLines((prev) => ({ ...prev, low: !prev.low }))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                visibleLines.low
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
              }`}
            >
              <span className="w-2.5 h-1 rounded bg-emerald-500"></span>
              <span>Low Risk</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span>Individual ML Risk Probability curve across sequential cases</span>
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto overflow-visible"
        />

        {/* Floating Tooltip Card */}
        {hoveredPoint && tooltipPos && (
          <div
            style={{
              left: `${Math.min(Math.max(tooltipPos.x, 100), dimensions.width - 110)}px`,
              top: `${Math.max(10, Math.min(tooltipPos.y - 120, dimensions.height - 160))}px`,
              transform: 'translateX(-50%)',
            }}
            className="pointer-events-none absolute z-20 min-w-56 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-700 text-white text-xs shadow-xl space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="font-mono font-bold text-teal-400">
                {hoveredPoint.caseId}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {hoveredPoint.timeLabel}
              </span>
            </div>

            <div className="text-[11px] text-slate-300">
              <span className="text-slate-400">Drug: </span>
              <span className="font-semibold text-white">{hoveredPoint.drug}</span>
            </div>

            {mode === 'percentage' && (
              <div className="space-y-0.5 pt-1 font-mono text-[11px]">
                <div className="flex justify-between text-red-400">
                  <span>High Risk:</span>
                  <span className="font-bold">{hoveredPoint.highPct}% ({hoveredPoint.highCount})</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Mod Risk:</span>
                  <span className="font-bold">{hoveredPoint.modPct}% ({hoveredPoint.modCount})</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Low Risk:</span>
                  <span className="font-bold">{hoveredPoint.lowPct}% ({hoveredPoint.lowCount})</span>
                </div>
              </div>
            )}

            {mode === 'count' && (
              <div className="space-y-0.5 pt-1 font-mono text-[11px]">
                <div className="flex justify-between text-red-400">
                  <span>High Risk Total:</span>
                  <span className="font-bold">{hoveredPoint.highCount}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Mod Risk Total:</span>
                  <span className="font-bold">{hoveredPoint.modCount}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Low Risk Total:</span>
                  <span className="font-bold">{hoveredPoint.lowCount}</span>
                </div>
              </div>
            )}

            {mode === 'trajectory' && (
              <div className="pt-1 font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Case Score:</span>
                  <span className="font-bold text-sky-400">{hoveredPoint.probability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Tier:</span>
                  <span className="font-bold text-white">{hoveredPoint.riskCategory}</span>
                </div>
              </div>
            )}

            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
              Temporal Step {hoveredPoint.index + 1} of {hoveredPoint.totalCount}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Notice */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Continuous line smoothing computed via D3 monotone cubic spline.</span>
        </div>
        <span>X-Axis: Chronological Case Ingestion Time</span>
      </div>
    </div>
  );
};
