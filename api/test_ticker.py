from services.ticker_service import normalize_ticker

def test_normalization():
    test_cases = {
        "PETR4": "PETR4.SA",
        "VALE3": "VALE3.SA",
        "AAPL": "AAPL",
        "MSFT": "MSFT",
        "BOVA11": "BOVA11.SA",
        "petr4": "PETR4.SA",
        "IBOV": "IBOV.SA" # Note: Regex might need adjustment if IBOV is just 4 letters
    }
    
    for input_ticker, expected in test_cases.items():
        result = normalize_ticker(input_ticker)
        print(f"Input: {input_ticker} -> Result: {result} | {'SUCCESS' if result == expected else 'FAILED'}")

if __name__ == "__main__":
    test_normalization()
