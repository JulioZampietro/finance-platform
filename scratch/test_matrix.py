import sys
import os
import json

# Add the api directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../api')))

from services.matrix_service import MatrixService

def test_matrix():
    service = MatrixService()
    print("Fetching matrix overview...")
    result = service.get_overview_matrix()
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    test_matrix()
