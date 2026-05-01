# QuantAnalytics Platform

A high-performance financial analysis platform built with Next.js 15 and FastAPI.

## Project Structure

- `api/`: FastAPI backend service
  - `main.py`: API endpoints and server configuration
  - `services/`: Business logic for fetching and processing financial data
  - `requirements.txt`: Python dependencies (`yfinance`, `pandas`, `fastapi`, etc.)
- `frontend/`: Next.js 15 dashboard
  - `src/app/`: Modern dashboard UI with Recharts integration
  - `package.json`: Frontend dependencies (`recharts`, `lucide-react`, etc.)

## Getting Started

### 1. Backend Setup
```bash
cd api
# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Features

- **Smart Ticker Normalization**: Automatically handles B3 tickers (e.g., inputting `PETR4` will fetch `PETR4.SA`).
- **Real-time Visualization**: Interactive area charts showing historical price action.
- **Data Validation**: Strict Pydantic models for reliable data handling.
- **Premium UI**: Sleek dark mode design with glassmorphism aesthetics.
