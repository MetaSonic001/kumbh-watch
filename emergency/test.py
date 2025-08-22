import requests
import time

# Base URL for your local app
BASE_URL = "http://localhost:5000"
test_call_id = f"test_call_{int(time.time())}"

# Step 1: Test the /test endpoint
response = requests.post(
    f"{BASE_URL}/test",
    data={"user_input": "Hello, I need help at Ramkund"}
)
print("Test endpoint response status:", response.status_code)
print("\nTest endpoint response:", response.json())