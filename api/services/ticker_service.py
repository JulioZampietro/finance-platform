import yfinance as yf
import pandas as pd
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class HistoricalDataPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    adj_close: float = Field(..., alias="Adj Close")

    class Config:
        populate_by_name = True

class TickerDataResponse(BaseModel):
    ticker: str
    data: List[HistoricalDataPoint]

def normalize_ticker(ticker: str) -> str:
    """
    Normalizes ticker symbols, appending .SA for B3 stocks if missing.
    """
    ticker = ticker.upper().strip()
    
    # Common B3 pattern: 4 letters followed by 1-2 digits (e.g., PETR4, BOVA11)
    # or 4 letters for some newer stocks or units.
    # If it doesn't have a dot and looks like a Brazilian stock, add .SA
    import re
    b3_pattern = re.compile(r'^[A-Z]{4}[0-9]{1,2}$')
    
    if b3_pattern.match(ticker) and "." not in ticker:
        return f"{ticker}.SA"
    
    return ticker

def fetch_historical_data(ticker: str, period: str = "1mo", interval: str = "1d") -> TickerDataResponse:
    normalized = normalize_ticker(ticker)
    t = yf.Ticker(normalized)
    hist = t.history(period=period, interval=interval)
    
    if hist.empty:
        # Try without .SA if we added it and it failed? 
        # Or just return empty
        return TickerDataResponse(ticker=normalized, data=[])

    # Convert pandas dataframe to list of dicts
    hist = hist.reset_index()
    # Handle column names (yfinance sometimes returns 'Adj Close' or just 'Close')
    if 'Adj Close' not in hist.columns:
        hist['Adj Close'] = hist['Close']
    
    data_points = []
    for _, row in hist.iterrows():
        data_points.append(HistoricalDataPoint(
            date=row['Date'].strftime('%Y-%m-%d'),
            open=row['Open'],
            high=row['High'],
            low=row['Low'],
            close=row['Close'],
            volume=int(row['Volume']),
            **{"Adj Close": row['Adj Close']}
        ))
    
    return TickerDataResponse(ticker=normalized, data=data_points)
