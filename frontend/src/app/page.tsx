"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, TrendingUp, AlertTriangle, Activity, X, Plus } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// --- Types ---
interface FinancialMetrics {
  cagr: number;
  volatility: number;
  max_drawdown: number;
}

interface BatchAnalyticsData {
  results: Record<string, FinancialMetrics>;
  chart: any[];
  metadata: {
    global_min: number;
    global_max: number;
    padding: number;
    y_domain: [number, number];
    tickers: string[];
  };
}

const COLORS = [
  "#10b981", // Emerald (Main)
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
];

import { MarketMatrix } from "@/components/MarketMatrix";

export default function Dashboard() {
  const [activeTicker, setActiveTicker] = useState("AAPL");
  const [comparisonTickers, setComparisonTickers] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [period, setPeriod] = useState("1y");
  const [benchmark, setBenchmark] = useState("^GSPC");
  
  const [batchData, setBatchData] = useState<BatchAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data for all tickers at once
  const fetchBatchData = async (tickers: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const tickersParam = tickers.join(",");
      const benchmarkParam = benchmark ? `&benchmark=${benchmark}` : "";
      const res = await fetch(`http://localhost:8000/api/analytics/batch?tickers=${tickersParam}&period=${period}${benchmarkParam}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch data from server.");
      }
      const result = await res.json();
      setBatchData(result);

      // Sync local state with normalized tickers (e.g. adding .SA)
      if (result.metadata.tickers && result.metadata.tickers.length > 0) {
        const [normalizedMain, ...normalizedOthers] = result.metadata.tickers;
        if (normalizedMain !== activeTicker) {
          setActiveTicker(normalizedMain);
        }
        if (JSON.stringify(normalizedOthers) !== JSON.stringify(comparisonTickers)) {
          setComparisonTickers(normalizedOthers);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const allTickers = [activeTicker, ...comparisonTickers];
    fetchBatchData(allTickers);
  }, [activeTicker, comparisonTickers, period, benchmark]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput) return;
    const normalized = searchInput.toUpperCase().trim();
    setActiveTicker(normalized);
    setComparisonTickers([]); 
    setSearchInput("");
  };

  const addComparison = () => {
    if (!searchInput) return;
    const normalized = searchInput.toUpperCase().trim();
    if (normalized === activeTicker || comparisonTickers.includes(normalized)) {
      setError("Ticker already added.");
      return;
    }
    setComparisonTickers(prev => [...prev, normalized]);
    setSearchInput("");
  };

  const removeComparison = (symbol: string) => {
    setComparisonTickers(prev => prev.filter(t => t !== symbol));
  };

  const activeMetrics = batchData?.results[activeTicker];

  // Calculate dynamic domain for Recharts linear scale
  const yDomain = useMemo(() => {
    if (!batchData) return [-5, 5];
    const { global_min, global_max } = batchData.metadata;
    return [global_min - 5, global_max + 5];
  }, [batchData]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 lg:p-6 font-sans selection:bg-[#10b981]/30">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <TrendingUp className="text-[#10b981] w-8 h-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
              Finance<span className="text-[#10b981]">Engine</span>
            </h1>
            <p className="text-zinc-400 mt-1">Institutional-grade market analytics</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#18181b] border border-zinc-800 rounded-lg p-1 focus-within:border-[#10b981] transition-all">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <Input 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  placeholder="Ticker (e.g. AAPL, PETR4)" 
                  className="pl-8 w-32 lg:w-48 bg-transparent border-none focus-visible:ring-0 text-sm"
                />
              </div>
              <Button onClick={handleSearch} size="sm" variant="ghost" className="hover:text-[#10b981] h-8">
                View
              </Button>
              <div className="w-[1px] h-4 bg-zinc-800" />
              <Button onClick={addComparison} size="sm" variant="ghost" className="hover:text-[#10b981] h-8 gap-1">
                <Plus className="w-3 h-3" /> Compare
              </Button>
            </div>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-[#18181b] border-zinc-800 focus:ring-[#10b981]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-zinc-800 text-white">
                <SelectItem value="1mo">1 Month</SelectItem>
                <SelectItem value="6mo">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="2y">2 Years</SelectItem>
                <SelectItem value="5y">5 Years</SelectItem>
                <SelectItem value="max">Max</SelectItem>
              </SelectContent>
            </Select>

            <Select value={benchmark} onValueChange={setBenchmark}>
              <SelectTrigger className="w-40 bg-[#18181b] border-zinc-800 focus:ring-[#10b981]">
                <SelectValue placeholder="Benchmark" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-zinc-800 text-white">
                <SelectItem value="^GSPC">S&P 500</SelectItem>
                <SelectItem value="^DJI">Dow Jones</SelectItem>
                <SelectItem value="^BVSP">IBOVESPA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ticker Badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500 uppercase tracking-widest mr-2">Comparison:</span>
          <div className={cn(
            "flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#10b981]/10 border border-[#10b981] text-[#10b981] text-xs font-medium"
          )}>
            {activeTicker}
            <span className="text-[10px] bg-[#10b981] text-[#09090b] px-1 rounded ml-1">Main</span>
          </div>
          {comparisonTickers.map((t, idx) => (
            <div key={t} className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium hover:border-zinc-700 transition-all group">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(idx + 1) % COLORS.length] }} />
              {t}
              <button onClick={() => removeComparison(t)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Error Handling */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg text-red-500 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#09090b] border-[#10b981]/30 hover:border-[#10b981] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-[#10b981] transition-colors">CAGR</CardTitle>
              <TrendingUp className="h-4 w-4 text-[#10b981]" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white tracking-tight">
                {loading ? "..." : activeMetrics ? `${(activeMetrics.cagr * 100).toFixed(2)}%` : "0.00%"}
              </div>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-tighter">Compounded Annual Growth</p>
            </CardContent>
          </Card>

          <Card className="bg-[#09090b] border-[#10b981]/30 hover:border-[#10b981] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-[#10b981] transition-colors">Volatility (Ann.)</CardTitle>
              <Activity className="h-4 w-4 text-[#10b981]" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white tracking-tight">
                {loading ? "..." : activeMetrics ? `${(activeMetrics.volatility * 100).toFixed(2)}%` : "0.00%"}
              </div>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-tighter">Standard deviation of returns</p>
            </CardContent>
          </Card>

          <Card className="bg-[#09090b] border-[#10b981]/30 hover:border-[#10b981] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.1)] group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-red-500 transition-colors">Max Drawdown</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white tracking-tight">
                {loading ? "..." : activeMetrics ? `${(activeMetrics.max_drawdown * 100).toFixed(2)}%` : "0.00%"}
              </div>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-tighter">Peak-to-trough decline</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Chart Area */}
        <Card className="bg-[#09090b] border-zinc-800 overflow-hidden shadow-2xl">
          <CardHeader className="border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Market Performance</CardTitle>
              <p className="text-sm text-zinc-400 mt-1">
                Relative performance (%) starting from 0.0
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <span className="text-xs text-zinc-400 uppercase tracking-widest">{benchmark || "Benchmark"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span className="text-xs text-[#10b981] uppercase tracking-widest font-bold">{activeTicker}</span>
              </div>
              {comparisonTickers.map((t, idx) => (
                <div key={t} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(idx + 1) % COLORS.length] }} />
                  <span className="text-xs text-zinc-400 uppercase tracking-widest">{t}</span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[350px] w-full">
              {loading && !batchData ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4 animate-pulse">
                   <Activity className="w-8 h-8 text-[#10b981] animate-spin" />
                   <span className="uppercase tracking-[0.2em] text-xs">Ingesting Market Data...</span>
                </div>
              ) : batchData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    key={[activeTicker, ...comparisonTickers].join('-')}
                    data={batchData.chart} 
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gradient-main" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradient-benchmark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#71717a" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                      </linearGradient>
                      {comparisonTickers.map((t, idx) => (
                        <linearGradient key={`grad-${t}`} id={`gradient-${t}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[(idx + 1) % COLORS.length]} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS[(idx + 1) % COLORS.length]} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#3f3f46" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={40}
                      tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    />
                    <YAxis 
                      stroke="#3f3f46" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `${val.toFixed(1)}%`}
                      domain={yDomain}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)" }}
                      itemStyle={{ fontSize: "12px", padding: "2px 0" }}
                      labelStyle={{ color: "#71717a", marginBottom: "4px", fontSize: "11px" }}
                      cursor={{ stroke: '#27272a', strokeWidth: 1 }}
                      formatter={(val: any) => [`${val.toFixed(2)}%`]}
                    />
                    

                    <Area 
                      type="monotone" 
                      dataKey="benchmark_val"
                      stroke="#3f3f46" 
                      strokeWidth={1}
                      fillOpacity={1} 
                      fill="url(#gradient-benchmark)" 
                      name="BENCHMARK"
                      isAnimationActive={false}
                      connectNulls={true}
                    />

                    <Area 
                      type="monotone" 
                      dataKey={(p: any) => (p[batchData.metadata.tickers[0]] || 0)}
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#gradient-main)" 
                      name={batchData.metadata.tickers[0]}
                      style={{ filter: 'drop-shadow(0px 0px 10px #10b981)' }}
                      connectNulls={true}
                    />

                    {batchData.metadata.tickers.slice(1).map((t, idx) => (
                      <Area 
                        key={t}
                        type="monotone" 
                        dataKey={(p: any) => (p[t] || 0)}
                        stroke={COLORS[(idx + 1) % COLORS.length]} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill={`url(#gradient-${t})`} 
                        name={t}
                        connectNulls={true}
                      />
                    ))}

                    {/* 10% Milestones - Rendered on top */}
                    {[...Array(21)].map((_, i) => {
                      const val = (i - 10) * 10; // -100 to 100 in steps of 10
                      if (!batchData) return null;
                      const { global_min, global_max } = batchData.metadata;
                      if (val < global_min - 10 || val > global_max + 10) return null;
                      
                      return (
                        <ReferenceLine 
                          key={`milestone-${val}`}
                          y={val} 
                          stroke="#71717a" 
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          label={{ 
                            position: 'left', 
                            value: `${val > 0 ? '+' : ''}${val}%`, 
                            fill: '#71717a', 
                            fontSize: 10,
                            fontWeight: 'bold'
                          }} 
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 uppercase tracking-widest text-xs">
                  Awaiting analysis parameters...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Matrix Section */}
        <MarketMatrix />

        {/* Footer */}
        <footer className="pt-10 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-xs">
          <p>© 2026 FinanceEngine Analytics. Market data provided by Yahoo Finance.</p>
          <div className="flex gap-6 uppercase tracking-[0.15em]">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Schema</span>
            <span className="hover:text-white cursor-pointer transition-colors">Service Terms</span>
            <span className="hover:text-white cursor-pointer transition-colors">API v1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
