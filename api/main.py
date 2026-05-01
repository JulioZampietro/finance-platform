from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from services.ticker_service import fetch_historical_data, TickerDataResponse
from services.financial_engine import FinancialEngine, AnalyticsResponse, BatchFinancialEngine, BatchAnalyticsResponse
from services.matrix_service import MatrixService

app = FastAPI(title="Finance Analysis API")
matrix_service = MatrixService()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Finance Analysis API is running"}

@app.get("/api/ticker/{ticker}", response_model=TickerDataResponse)
async def get_ticker_data(
    ticker: str, 
    period: str = Query("1mo", description="Period of data (e.g., 1d, 5d, 1mo, 1y, max)"),
    interval: str = Query("1d", description="Data interval (e.g., 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)")
):
    try:
        data = fetch_historical_data(ticker, period, interval)
        if not data.data:
            raise HTTPException(status_code=404, detail=f"No data found for ticker {ticker}")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/batch", response_model=BatchAnalyticsResponse)
async def get_batch_analytics(
    tickers: str = Query(..., description="Comma-separated list of tickers"),
    period: str = Query("1y", description="Period (e.g., 1y, 2y, 5y, max)"),
    benchmark: str = Query(None, description="Benchmark symbol")
):
    try:
        ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
        if not ticker_list:
            raise HTTPException(status_code=400, detail="No tickers provided")
            
        engine = BatchFinancialEngine(ticker_list, period)
        if not engine.fetch_batch_data():
            raise HTTPException(status_code=404, detail="Could not fetch data for the requested tickers")
            
        return engine.get_batch_analytics(benchmark_symbol=benchmark)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/{ticker}", response_model=AnalyticsResponse)
async def get_ticker_analytics(
    ticker: str,
    period: str = Query("1y", description="Period of data for analysis (e.g., 1y, 2y, 5y, max)"),
    benchmark: str = Query(None, description="Benchmark symbol (e.g., ^GSPC, ^BVSP, ^DJI)")
):
    try:
        engine = FinancialEngine(ticker, period)
        if not engine.fetch_data():
            raise HTTPException(status_code=404, detail=f"No data found for ticker {ticker}")
        
        metrics = engine.get_metrics(benchmark_symbol=benchmark)
        return metrics
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/matrix/overview")
async def get_matrix_overview(
    period: str = Query("5y", description="Period for matrix analytics (e.g., 1mo, ytd, 1y, 5y, max)"),
    add_tickers: Optional[str] = Query(None, description="Comma-separated list of additional tickers")
):
    try:
        tickers_list = add_tickers.split(",") if add_tickers else None
        return matrix_service.get_overview_matrix(period=period, add_tickers=tickers_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
