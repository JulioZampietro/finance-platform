import pandas as pd
import numpy as np
import yfinance as yf
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from .ticker_service import normalize_ticker

class FinancialMetrics(BaseModel):
    cagr: float
    volatility: float
    max_drawdown: float

class BenchmarkPoint(BaseModel):
    date: str
    ticker_val: float
    benchmark_val: float

class BenchmarkData(BaseModel):
    symbol: str
    data: List[BenchmarkPoint]

class Metadata(BaseModel):
    global_min: float
    global_max: float
    padding: float
    y_domain: List[float]
    tickers: Optional[List[str]] = None

class AnalyticsResponse(BaseModel):
    ticker: str
    metrics: FinancialMetrics
    benchmark: BenchmarkData
    metadata: Metadata

class BatchAnalyticsResponse(BaseModel):
    results: Dict[str, FinancialMetrics]
    chart: List[Dict[str, Any]]
    metadata: Metadata

class FinancialEngine:
    def __init__(self, ticker: str, period: str = "1y"):
        self.ticker = normalize_ticker(ticker)
        self.period = period
        self.df = None
        
    def fetch_data(self) -> bool:
        """Fetches historical data for the ticker."""
        try:
            t = yf.Ticker(self.ticker)
            self.df = t.history(period=self.period)
            if self.df.empty:
                return False
            return True
        except Exception:
            return False

    def get_metrics(self, benchmark_symbol: str = None) -> Dict[str, Any]:
        """Calculates and returns all financial metrics."""
        if self.df is None or self.df.empty:
            return {}

        prices = self.df['Close']
        returns = prices.pct_change().dropna()

        cagr = self.calculate_cagr(prices)
        volatility = self.calculate_volatility(returns)
        max_drawdown = self.calculate_max_drawdown(prices)
        
        if benchmark_symbol is None:
            benchmark_symbol = "^BVSP" if self.ticker.endswith(".SA") else "^GSPC"
            
        benchmark_comp = self.get_benchmark_comparison(prices, benchmark_symbol)

        t_vals = [p['ticker_val'] for p in benchmark_comp['data']]
        b_vals = [p['benchmark_val'] for p in benchmark_comp['data']]
        
        if not t_vals:
            g_min, g_max, padding, domain = 0.0, 0.0, 0.0, [0.0, 0.0]
        else:
            g_min = float(min(min(t_vals), min(b_vals)))
            g_max = float(max(max(t_vals), max(b_vals)))
            range_val = g_max - g_min
            padding = range_val * 0.05
            domain = [g_min - padding, g_max + padding]

        return {
            "ticker": self.ticker,
            "metrics": {
                "cagr": cagr,
                "volatility": volatility,
                "max_drawdown": max_drawdown,
            },
            "benchmark": benchmark_comp,
            "metadata": {
                "global_min": round(g_min, 2),
                "global_max": round(g_max, 2),
                "padding": round(padding, 2),
                "y_domain": [round(d, 2) for d in domain]
            }
        }

    @staticmethod
    def calculate_cagr(prices: pd.Series) -> float:
        if len(prices) < 2: return 0.0
        start_val, end_val = prices.iloc[0], prices.iloc[-1]
        days = (prices.index[-1] - prices.index[0]).days
        years = days / 365.25
        if years <= 0 or start_val <= 0: return 0.0
        return float((end_val / start_val) ** (1 / years) - 1)

    @staticmethod
    def calculate_volatility(returns: pd.Series) -> float:
        if len(returns) < 2: return 0.0
        return float(returns.std() * np.sqrt(252))

    @staticmethod
    def calculate_max_drawdown(prices: pd.Series) -> float:
        if len(prices) < 2: return 0.0
        roll_max = prices.cummax()
        drawdown = (prices - roll_max) / roll_max
        return float(drawdown.min())

    def get_benchmark_comparison(self, ticker_prices: pd.Series, benchmark_symbol: str) -> Dict[str, Any]:
        try:
            start_date, end_date = ticker_prices.index[0], ticker_prices.index[-1]
            b_df = yf.Ticker(benchmark_symbol).history(start=start_date, end=end_date)
            if b_df.empty: return {"symbol": benchmark_symbol, "data": []}
            
            combined = pd.DataFrame({'ticker': ticker_prices, 'benchmark': b_df['Close']}).ffill().dropna()
            if combined.empty: return {"symbol": benchmark_symbol, "data": []}

            t_rel = (combined['ticker'] / combined['ticker'].iloc[0] - 1) * 100
            b_rel = (combined['benchmark'] / combined['benchmark'].iloc[0] - 1) * 100
            
            return {
                "symbol": benchmark_symbol,
                "data": [{"date": d.strftime('%Y-%m-%d'), "ticker_val": round(float(t), 2), "benchmark_val": round(float(b), 2)} 
                         for d, t, b in zip(combined.index, t_rel, b_rel)]
            }
        except Exception:
            return {"symbol": benchmark_symbol, "data": []}

class BatchFinancialEngine:
    def __init__(self, tickers: List[str], period: str = "1y"):
        self.tickers = [normalize_ticker(t) for t in tickers]
        self.period = period
        self.df = None

    def fetch_batch_data(self) -> bool:
        try:
            # Fetch all at once. 
            data = yf.download(self.tickers, period=self.period, progress=False)
            if data.empty:
                return False
            
            if 'Close' not in data:
                return False

            close_data = data['Close']
            
            # If multiple tickers, 'Close' is a DataFrame
            if isinstance(close_data, pd.DataFrame):
                # Only keep tickers that were successfully returned
                valid_tickers = [t for t in self.tickers if t in close_data.columns]
                if not valid_tickers:
                    return False
                self.df = close_data[valid_tickers]
                self.tickers = valid_tickers
            else:
                # Single ticker case
                self.df = pd.DataFrame({self.tickers[0]: close_data})
                
            # Hole Filling
            self.df = self.df.ffill().bfill()
            
            # Smart Resampling for large datasets
            if self.period in ['5y', 'max']:
                self.df = self.df.resample('W').last()
                
            return not self.df.empty
        except Exception as e:
            print(f"Batch fetch error: {e}")
            return False

    def get_batch_analytics(self, benchmark_symbol: Optional[str] = None) -> Dict[str, Any]:
        if self.df is None or self.df.empty:
            return {}

        # 1. Calculate Metrics for each ticker
        results = {}
        for ticker in self.tickers:
            prices = self.df[ticker]
            returns = prices.pct_change().dropna()
            results[ticker] = {
                "cagr": FinancialEngine.calculate_cagr(prices),
                "volatility": FinancialEngine.calculate_volatility(returns),
                "max_drawdown": FinancialEngine.calculate_max_drawdown(prices)
            }

        # 2. Add Benchmark if requested
        start_date, end_date = self.df.index[0], self.df.index[-1]
        if not benchmark_symbol:
            benchmark_symbol = "^BVSP" if any(t.endswith(".SA") for t in self.tickers) else "^GSPC"
            
        try:
            # Fetch benchmark daily to ensure we have coverage
            b_ticker = yf.Ticker(benchmark_symbol)
            b_raw = b_ticker.history(start=start_date, end=end_date)['Close']
            
            if not b_raw.empty:
                # Align timezones
                if self.df.index.tz is not None and b_raw.index.tz is None:
                    b_raw.index = b_raw.index.tz_localize(self.df.index.tz)
                elif self.df.index.tz is None and b_raw.index.tz is not None:
                    b_raw.index = b_raw.index.tz_localize(None)
                
                # Use a union of indices to ensure we can forward-fill gaps (like weekends)
                full_index = b_raw.index.union(self.df.index).sort_values()
                b_aligned = b_raw.reindex(full_index).ffill().bfill()
                
                # Now reindex to exactly our (possibly resampled) dataframe index
                self.df['benchmark'] = b_aligned.reindex(self.df.index).ffill().bfill()
            else:
                self.df['benchmark'] = 1.0 # Constant price to result in 0% return
        except Exception as e:
            print(f"Benchmark error: {e}")
            self.df['benchmark'] = 1.0 # Constant price

        # 3. Normalization (Relative Returns starting at 0%)
        # Ensure we don't divide by zero or NaN
        base_prices = self.df.iloc[0].replace(0, 1).fillna(1)
        returns_df = (self.df / base_prices - 1) * 100
        
        # Final safety fill to catch any remaining NaNs in the return series
        returns_df = returns_df.fillna(0)
        
        # 4. Prepare Chart Data
        chart_data = []
        for date, row in returns_df.iterrows():
            point = {"date": date.strftime('%Y-%m-%d')}
            for ticker in self.tickers:
                point[ticker] = round(float(row[ticker]), 2)
            point["benchmark_val"] = round(float(row["benchmark"]), 2)
            chart_data.append(point)

        # 5. Metadata
        g_min = float(returns_df.min().min())
        g_max = float(returns_df.max().max())
        range_val = g_max - g_min
        padding = range_val * 0.05

        return {
            "results": results,
            "chart": chart_data,
            "metadata": {
                "global_min": round(g_min, 2),
                "global_max": round(g_max, 2),
                "padding": round(padding, 2),
                "y_domain": [round(g_min - padding, 2), round(g_max + padding, 2)],
                "tickers": self.tickers
            }
        }
