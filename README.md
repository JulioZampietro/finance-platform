# QuantAnalytics Platform

An institutional-grade financial analysis dashboard providing real-time metrics, interactive visualizations, and a comprehensive market matrix for Brazilian (B3) and Global assets.

![Dashboard Overview](https://img.shields.io/badge/Status-Stable-emerald)
![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-black)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)

## 🚀 Core Functionalities

### 1. Unified Performance Charting
*   **Multi-Ticker Comparison**: Side-by-side performance analysis of multiple assets relative to a global benchmark (S&P 500, IBOVESPA).
*   **Dynamic Analytics**: Real-time calculation of CAGR, Annualized Volatility, and Max Drawdown for the primary selected ticker.
*   **Adaptive Visuals**: Recharts-powered area charts with high-fidelity gradients, milestone markers, and dynamic Y-axis scaling.

### 2. Market Matrix (Institutional Overview)
*   **Asset Universe**: Pre-defined tracking of key B3 blue chips and major global indices (S&P 500, Nikkei 225, etc.).
*   **User-Defined Expansion**: Search and add any custom ticker to the matrix with instant data ingestion.
*   **Advanced Metrics**: Deep-dive analytics including Sharpe Ratio, P/E Ratios, Dividend Yields, and 5Y CAGR.
*   **Heatmapping**: Conditional styling and pill-based design for quick identification of risk-adjusted outperformers (Sharpe > 1).
*   **7D Trends**: High-density sparkline visualizations with dynamic domain scaling for immediate volatility context.

### 3. Advanced Filtering & Context
*   **Independent Time Horizons**: Separate time filters for the main chart and the market matrix (1M, YTD, 1Y, 5Y, Max).
*   **Institutional Tooltips**: Comprehensive financial education on hover, explaining complex metrics like Sharpe Ratio and CAGR.
*   **Smart Normalization**: Automatic handling of B3 tickers (e.g., `VALE3` -> `VALE3.SA`).

## 🛠 Tech Stack

### Frontend
*   **Framework**: Next.js 15 (App Router, React 19)
*   **Table Engine**: TanStack Table (React Table)
*   **Visualization**: Recharts (Custom Area Charts & Sparklines)
*   **UI Components**: Shadcn UI & Tailwind CSS
*   **Icons**: Lucide React

### Backend
*   **Engine**: FastAPI (Python 3.10+)
*   **Data Processing**: Pandas & NumPy
*   **Market Data**: Yahoo Finance (yfinance)
*   **Concurrency**: Parallel ticker processing via `ThreadPoolExecutor` for low-latency batch analysis.
*   **Caching**: In-memory caching with 15-minute TTL for optimized endpoint performance.

## 🏗 Implementation Architecture

The project follows a **Split-Architecture** design:

1.  **Backend (api/)**: A high-concurrency FastAPI service. It utilizes a `MatrixService` to handle complex batch calculations and `FinancialEngine` for precise metric normalization. All data is processed on-the-fly with a caching layer to minimize external API latency.
2.  **Frontend (frontend/)**: A modern, client-side rendered dashboard. It uses TanStack Table for efficient row management and independent state hooks to allow simultaneous analysis across different time windows.

## 💻 How to Use

### Prerequisites
*   Python 3.10+
*   Node.js 18+

### 1. Backend Setup
```bash
cd api
# Setup virtual environment
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Run the dashboard
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📄 License
MIT License - feel free to use this project for your own financial analysis or as a template for high-performance dashboarding.
