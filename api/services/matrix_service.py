import yfinance as yf
import pandas as pd
import numpy as np
import concurrent.futures
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from .ticker_service import normalize_ticker
from .financial_engine import FinancialEngine

class MatrixService:
    def __init__(self):
        self.cache = {}
        self.cache_ttl = timedelta(minutes=15)
        self.b3_tickers = ['VALE3.SA', 'PETR4.SA', 'ITUB4.SA', 'BBAS3.SA', 'WEGE3.SA', 'TAEE11.SA']
        self.global_tickers = ['^BVSP', '^GSPC', '^FTSE', '^N225']
        self.all_tickers = self.b3_tickers + self.global_tickers

    def _calculate_metrics(self, prices: pd.Series, period: str) -> Dict[str, Any]:
        """Calculates metrics based on the requested period."""
        if prices.empty or len(prices) < 2:
            return {
                "cagr": None,
                "total_return": None,
                "max_drawdown": None,
                "sharpe_ratio": None
            }

        # Ensure no NaNs for calculations
        prices = prices.ffill().bfill()
        
        # 1. Total Return
        total_return = (prices.iloc[-1] / prices.iloc[0]) - 1 if not prices.empty and prices.iloc[0] != 0 else 0

        # 2. CAGR - Only if period is 1y, 5y, or max
        cagr = None
        if period in ['1y', '5y', 'max']:
            cagr = FinancialEngine.calculate_cagr(prices)

        # 3. Max Drawdown
        max_drawdown = FinancialEngine.calculate_max_drawdown(prices)

        # 4. Sharpe Ratio (RF = 4%)
        # Note: Sharpe ratio calculation usually depends on excess returns. 
        # Using CAGR as the return metric for long term, but for short term we might need a different approach.
        # However, following the pattern:
        returns = prices.pct_change().dropna()
        volatility = FinancialEngine.calculate_volatility(returns)
        
        # If CAGR is not available, we can't use it for Sharpe in the current FinancialEngine implementation.
        # Let's approximate return if CAGR is None for the sake of the formula, or just use total_return annualized.
        # But if the user didn't specify, I'll follow the requirement.
        # Wait, if CAGR is null, what should Sharpe be? 
        # Usually Sharpe is (Ann. Return - RF) / Ann. Volatility.
        # If we don't have CAGR, we might need to annualize the total return.
        # But user said "only calculate CAGR if...". 
        # I'll calculate an internal 'annualized_return' for Sharpe if needed, or just use CAGR if available.
        
        calc_return = cagr if cagr is not None else FinancialEngine.calculate_cagr(prices) # still need it for sharpe
        sharpe_ratio = FinancialEngine.calculate_sharpe_ratio(calc_return, volatility, risk_free_rate=0.04)

        return {
            "cagr": cagr,
            "total_return": float(total_return),
            "max_drawdown": float(max_drawdown),
            "sharpe_ratio": float(sharpe_ratio)
        }

    def _fetch_ticker_data(self, ticker_symbol: str, period: str) -> Dict[str, Any]:
        """Fetches fundamentals, historical data, and calculates metrics for a single ticker."""
        try:
            ticker = yf.Ticker(ticker_symbol)
            
            # Fetch history for requested period
            history = ticker.history(period=period)
            if history.empty:
                return {
                    "symbol": ticker_symbol,
                    "name": ticker_symbol,
                    "fundamentals": {"pe_ratio": None, "dividend_yield": None},
                    "analytics": {"cagr": None, "total_return": None, "max_drawdown": None, "sharpe_ratio": None},
                    "sparkline": [],
                    "error": "No data found"
                }
            
            prices = history['Close']
            metrics = self._calculate_metrics(prices, period)
            
            # Sparkline: Last 7 daily closing prices
            sparkline_prices = prices.tail(7).tolist()
            sparkline = [round(float(p), 2) for p in sparkline_prices]

            # Info / Fundamentals (Always snapshots)
            info = ticker.info
            
            return {
                "symbol": ticker_symbol,
                "name": info.get("longName") or info.get("shortName") or ticker_symbol,
                "fundamentals": {
                    "pe_ratio": info.get("trailingPE"),
                    "dividend_yield": info.get("dividendYield")
                },
                "analytics": {
                    "cagr": metrics["cagr"],
                    "total_return": metrics["total_return"],
                    "max_drawdown": metrics["max_drawdown"],
                    "sharpe_ratio": metrics["sharpe_ratio"]
                },
                "sparkline": sparkline
            }
        except Exception as e:
            print(f"Error fetching data for {ticker_symbol}: {e}")
            return {
                "symbol": ticker_symbol,
                "name": ticker_symbol,
                "fundamentals": {"pe_ratio": None, "dividend_yield": None},
                "analytics": {"cagr": None, "total_return": None, "max_drawdown": None, "sharpe_ratio": None},
                "sparkline": [],
                "error": str(e)
            }

    def get_overview_matrix(self, period: str = "5y") -> Dict[str, Any]:
        """Returns the overview matrix for a given period, using cache if valid."""
        now = datetime.now()
        cache_key = f"overview_{period}"
        
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if now - timestamp < self.cache_ttl:
                return data

        # Fetch in parallel
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(self.all_tickers)) as executor:
            future_to_ticker = {executor.submit(self._fetch_ticker_data, t, period): t for t in self.all_tickers}
            for future in concurrent.futures.as_completed(future_to_ticker):
                results.append(future.result())

        response = {
            "b3": [r for r in results if r["symbol"] in self.b3_tickers],
            "global": [r for r in results if r["symbol"] in self.global_tickers],
            "period": period,
            "last_updated": now.isoformat()
        }
        
        self.cache[cache_key] = (response, now)
        return response
