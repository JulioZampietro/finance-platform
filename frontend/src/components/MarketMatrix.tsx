"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable,
  getSortedRowModel,
  SortingState
} from "@tanstack/react-table";
import { 
  LineChart, 
  Line, 
  ResponsiveContainer,
  YAxis
} from "recharts";
import { ArrowUpDown, Loader2, Info, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MatrixTickerData {
  symbol: string;
  name: string;
  fundamentals: {
    pe_ratio: number | null;
    dividend_yield: number | null;
  };
  analytics: {
    cagr: number | null;
    total_return: number | null;
    max_drawdown: number | null;
    sharpe_ratio: number | null;
  };
  sparkline: number[];
}

interface MatrixResponse {
  b3: MatrixTickerData[];
  global: MatrixTickerData[];
  others: MatrixTickerData[];
  last_updated: string;
}

const columnHelper = createColumnHelper<MatrixTickerData>();

const PERIODS = [
  { label: "1M", value: "1mo" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "Max", value: "max" },
];

const Sparkline = React.memo(({ data }: { data: number[] }) => {
  if (!data || data.length === 0) {
    return <span className="text-zinc-800 text-[10px]">NO TREND</span>;
  }

  const sparkData = data.map((v, i) => ({ i, v }));
  const isUp = sparkData.length > 1 && sparkData[sparkData.length - 1].v >= sparkData[0].v;
  
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sparkData}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line 
            type="monotone" 
            dataKey="v" 
            stroke={isUp ? "#10b981" : "#e11d48"} 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

Sparkline.displayName = "Sparkline";

export function MarketMatrix() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tablePeriod, setTablePeriod] = useState("5y");
  const [userTickers, setUserTickers] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const tickersParam = userTickers.length > 0 ? `&add_tickers=${userTickers.join(",")}` : "";
        const res = await fetch(`http://localhost:8000/api/matrix/overview?period=${tablePeriod}${tickersParam}`);
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch matrix data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tablePeriod, userTickers]);

  const handleAddTicker = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!tickerInput) return;
    const normalized = tickerInput.trim().toUpperCase();
    if (userTickers.includes(normalized)) {
      setTickerInput("");
      return;
    }
    setUserTickers(prev => [normalized, ...prev]);
    setTickerInput("");
  };

  const handleRemoveTicker = (symbol: string) => {
    setUserTickers(prev => prev.filter(t => t !== symbol));
  };

  const tableData = useMemo(() => {
    if (!data) return [];
    // User added tickers (others) appear first
    return [...data.others, ...data.b3, ...data.global];
  }, [data]);

  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <button 
          className="flex items-center gap-2 hover:text-[#10b981] transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: info => (
        <div className="font-semibold text-zinc-100 truncate max-w-[180px]">
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("symbol", {
      header: "Ticker",
      cell: info => <span className="text-zinc-500 font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor("analytics.cagr", {
      header: ({ column }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="flex items-center gap-1.5 hover:text-[#10b981] transition-colors"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              CAGR <Info className="w-3 h-3 text-zinc-600" /> <ArrowUpDown className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Compound Annual Growth Rate. The smoothed annualized return over the selected period.
          </TooltipContent>
        </Tooltip>
      ),
      cell: info => {
        const val = info.getValue();
        if (val === null) return <span className="text-zinc-600 text-[10px]">N/A</span>;
        return (
          <span className={cn("font-medium", val >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {(val * 100).toFixed(2)}%
          </span>
        );
      },
    }),
    columnHelper.accessor("analytics.total_return", {
      header: ({ column }) => (
        <button 
          className="flex items-center gap-2 hover:text-[#10b981] transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Return ({tablePeriod.toUpperCase()}) <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: info => {
        const val = info.getValue();
        if (val === null) return "—";
        return (
          <span className={cn(
            "px-2 py-1 rounded text-xs font-bold", 
            val >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
          )}>
            {(val * 100).toFixed(1)}%
          </span>
        );
      },
    }),
    columnHelper.accessor("analytics.sharpe_ratio", {
      header: ({ column }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="flex items-center gap-1.5 hover:text-[#10b981] transition-colors"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Sharpe <Info className="w-3 h-3 text-zinc-600" /> <ArrowUpDown className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Measures risk-adjusted return. &gt;1 is good, &gt;2 is excellent. (Risk-free rate: 4%)
          </TooltipContent>
        </Tooltip>
      ),
      cell: info => {
        const val = info.getValue();
        if (val === null) return "—";
        
        let bgColor = "";
        let textColor = "text-zinc-500";
        
        if (val > 2) {
          bgColor = "bg-emerald-500/20";
          textColor = "text-emerald-400";
        } else if (val >= 1) {
          bgColor = "bg-emerald-500/10";
          textColor = "text-emerald-500";
        }
        
        return (
          <span className={cn(
            "px-2 py-1 rounded-md font-medium text-xs whitespace-nowrap",
            bgColor,
            textColor
          )}>
            {val.toFixed(2)}
          </span>
        );
      },
    }),
    columnHelper.accessor("analytics.max_drawdown", {
      header: ({ column }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              className="flex items-center gap-1.5 hover:text-[#10b981] transition-colors"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Max DD <Info className="w-3 h-3 text-zinc-600" /> <ArrowUpDown className="w-3 h-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            The largest peak-to-trough drop in value during the selected period.
          </TooltipContent>
        </Tooltip>
      ),
      cell: info => {
        const val = info.getValue();
        if (val === null) return "—";
        return <span className="text-zinc-400">{(val * 100).toFixed(1)}%</span>;
      },
    }),
    columnHelper.accessor("fundamentals.pe_ratio", {
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              P/E <Info className="w-3 h-3 text-zinc-600" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Price-to-Earnings. How much you pay for $1 of company profit.
          </TooltipContent>
        </Tooltip>
      ),
      cell: info => info.getValue()?.toFixed(1) || "—",
    }),
    columnHelper.accessor("fundamentals.dividend_yield", {
      header: "Div. Yield",
      cell: info => {
        const val = info.getValue();
        if (val === null) return "—";
        return `${(val * 100).toFixed(2)}%`;
      },
    }),
    columnHelper.accessor("sparkline", {
      header: "Trend (7D)",
      cell: info => <Sparkline data={info.getValue()} />,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: info => {
        const symbol = info.row.original.symbol;
        const isB3 = data?.b3.some(t => t.symbol === symbol);
        const isGlobal = data?.global.some(t => t.symbol === symbol);
        const isOther = !isB3 && !isGlobal;

        if (!isOther) return null;

        return (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleRemoveTicker(symbol)}
            className="h-8 w-8 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        );
      },
    }),
  ], [tablePeriod, data]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <TooltipProvider>
      <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Table Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#10b981] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Market Overview
            </h2>
            {data?.last_updated && !loading && (
               <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
                 Real-time Data
               </span>
            )}
          </div>

          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant="ghost"
                onClick={() => setTablePeriod(p.value)}
                className={cn(
                  "h-7 px-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                  tablePeriod === p.value 
                    ? "bg-zinc-800 text-[#10b981] shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="w-[1px] h-6 bg-zinc-800 hidden sm:block mx-1" />

          <form onSubmit={handleAddTicker} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <Input 
                placeholder="Add Ticker (e.g. AAPL)"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                className="h-8 w-[180px] pl-8 bg-zinc-900/50 border-zinc-800 text-xs focus-visible:ring-[#10b981]/50 focus-visible:border-[#10b981]/50 placeholder:text-zinc-700"
              />
            </div>
            <Button 
              type="submit" 
              size="sm" 
              variant="outline" 
              className="h-8 w-8 p-0 border-zinc-800 bg-zinc-900/50 hover:bg-[#10b981]/10 hover:text-[#10b981] hover:border-[#10b981]/50"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </div>

        <div className="relative rounded-xl border border-zinc-800 bg-[#09090b] overflow-hidden shadow-2xl">
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#09090b]/60 backdrop-blur-[2px] transition-all">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-[#10b981] animate-spin" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Synchronizing...</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
              <thead className="bg-zinc-900/50 border-b border-zinc-800">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, idx) => (
                      <th 
                        key={header.id} 
                        className={cn(
                          "px-4 py-4 font-medium text-zinc-500 uppercase tracking-widest text-[10px]",
                          idx === 0 && "sticky left-0 z-20 bg-zinc-900"
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className={cn(loading && "opacity-20 transition-opacity")}>
                {table.getRowModel().rows.map(row => {
                  const isIndex = row.original.symbol.startsWith("^");
                  const isB3 = data?.b3.some(t => t.symbol === row.original.symbol);
                  const isGlobal = data?.global.some(t => t.symbol === row.original.symbol);
                  const isOther = !isB3 && !isGlobal;

                  return (
                    <tr 
                      key={row.id}
                      className={cn(
                        "border-b border-zinc-900/50 hover:bg-[#10b981]/5 transition-colors group",
                        isIndex ? "bg-zinc-900/30" : "",
                        isOther ? "bg-[#10b981]/5 border-l-2 border-emerald-500/50" : ""
                      )}
                    >
                      {row.getVisibleCells().map((cell, idx) => (
                        <td 
                          key={cell.id} 
                          className={cn(
                            "px-4 py-4 text-zinc-300",
                            idx === 0 && "sticky left-0 z-10 bg-[#09090b] border-r border-zinc-800 group-hover:bg-[#0f1715]"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {!loading && data?.last_updated && (
          <p className="text-[9px] text-zinc-700 uppercase tracking-[0.2em] text-right px-1">
            Internal Engine Update: {new Date(data.last_updated).toLocaleString()}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
