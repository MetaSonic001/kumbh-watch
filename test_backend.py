#!/usr/bin/env python3
"""
Simple test script to verify backend API endpoints
"""

import requests
import json

# Backend URL (update this to match your setup)
BASE_URL = "http://localhost:8000"

def test_endpoint(endpoint, method="GET", data=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        else:
            print(f"❌ Unsupported method: {method}")
            return False
            
        if response.status_code == 200:
            print(f"✅ {method} {endpoint} - Success")
            try:
                result = response.json()
                print(f"   Response: {json.dumps(result, indent=2)[:200]}...")
            except:
                print(f"   Response: {response.text[:200]}...")
            return True
        else:
            print(f"❌ {method} {endpoint} - Failed (Status: {response.status_code})")
            print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ {method} {endpoint} - Connection failed (Is the backend running?)")
        return False
    except Exception as e:
        print(f"❌ {method} {endpoint} - Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Backend API Endpoints")
    print("=" * 50)
    
    # Test basic endpoints
    test_endpoint("/")
    test_endpoint("/status")
    
    # Test zone endpoints
    test_endpoint("/zones/heatmap")
    
    # Test creating a zone
    zone_data = {
        "name": "Test Zone",
        "type": "ghat",
        "coordinates": {"lng": 78.163, "lat": 29.9457, "radius": 100},
        "capacity": 1000,
        "description": "Test zone for API testing"
    }
    test_endpoint("/zones", "POST", zone_data)
    
    # Test team endpoints
    test_endpoint("/teams")
    
    print("\n" + "=" * 50)
    print("🎯 Test completed!")
    print("\nTo test video/stream processing:")
    print("1. Start the backend: uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print("2. Open the frontend dashboard")
    print("3. Add a camera or upload video")
    print("4. Select/create a zone")
    print("5. Watch the live map for heatmap updates!")

if __name__ == "__main__":
    main() 