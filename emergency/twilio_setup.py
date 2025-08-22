import os
import sys
from twilio.rest import Client
import subprocess
import time
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_environment():
    """Check if required environment variables are set"""
    required_vars = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"]
    missing = [var for var in required_vars if not os.environ.get(var)]
    
    if missing:
        print(f"Error: Missing environment variables: {', '.join(missing)}")
        print("Please set them in your .env file:")
        for var in missing:
            print(f"{var}=your_{var.lower()}")
        return False
    return True

def start_ngrok(port=5000):
    """Start ngrok and return the public URL"""
    print(f"Starting ngrok on port {port}...")
    
    # Check if ngrok is installed
    try:
        subprocess.run(["ngrok", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: ngrok is not installed or not in PATH.")
        print("Please install ngrok from https://ngrok.com/download")
        return None
    
    # Start ngrok process
    ngrok_process = subprocess.Popen(
        ["ngrok", "http", str(port)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for ngrok to start
    time.sleep(3)
    
    # Get ngrok URL
    try:
        response = requests.get("http://localhost:4040/api/tunnels")
        data = response.json()
        
        if not data["tunnels"]:
            print("Error: No ngrok tunnels found.")
            return None
        
        # Get HTTPS URL
        for tunnel in data["tunnels"]:
            if tunnel["proto"] == "https":
                return tunnel["public_url"]
        
        # Fallback to HTTP if HTTPS not found
        return data["tunnels"][0]["public_url"]
    except Exception as e:
        print(f"Error getting ngrok URL: {str(e)}")
        return None

def setup_twilio_number(ngrok_url):
    """Configure a Twilio phone number to use our webhook URLs"""
    if not check_environment():
        return
    
    account_sid = os.environ["TWILIO_ACCOUNT_SID"]
    auth_token = os.environ["TWILIO_AUTH_TOKEN"]
    
    client = Client(account_sid, auth_token)
    
    # Get available phone numbers
    try:
        numbers = client.incoming_phone_numbers.list()
        
        if not numbers:
            print("No phone numbers found in your Twilio account.")
            print("Would you like to purchase a new number? (y/n)")
            choice = input().lower()
            
            if choice == 'y':
                # Get available numbers
                country_code = input("Enter country code (e.g., IN for India, US for United States): ").upper() or "IN"
                available_numbers = client.available_phone_numbers(country_code).local.list(limit=5)
                
                if not available_numbers:
                    print(f"No numbers available for country code {country_code}.")
                    return
                
                print("\nAvailable phone numbers:")
                for i, number in enumerate(available_numbers):
                    print(f"{i+1}. {number.friendly_name} - {number.phone_number}")
                
                selection = int(input("\nSelect a number to purchase (1-5): ")) - 1
                if 0 <= selection < len(available_numbers):
                    number = client.incoming_phone_numbers.create(
                        phone_number=available_numbers[selection].phone_number,
                        voice_url=f"{ngrok_url}/voice"
                    )
                    print(f"Successfully purchased and configured {number.phone_number}")
                    return number.phone_number
                else:
                    print("Invalid selection")
                    return
            else:
                print("Setup cancelled")
                return
        else:
            print("\nExisting phone numbers in your account:")
            for i, number in enumerate(numbers):
                print(f"{i+1}. {number.friendly_name} - {number.phone_number}")
            
            selection = int(input("\nSelect a number to configure (1-{0}): ".format(len(numbers)))) - 1
            if 0 <= selection < len(numbers):
                number = numbers[selection]
                number.update(voice_url=f"{ngrok_url}/voice")
                print(f"Successfully configured {number.phone_number} with webhook URL: {ngrok_url}/voice")
                return number.phone_number
            else:
                print("Invalid selection")
                return
    except Exception as e:
        print(f"Error setting up Twilio number: {str(e)}")
        return None

def main():
    print("Emergency Response Voice Agent - Twilio Setup")
    print("============================================")
    
    # Start ngrok to get public URL
    ngrok_url = start_ngrok()
    if not ngrok_url:
        print("Failed to start ngrok. Exiting...")
        return
    
    print(f"Ngrok tunnel established: {ngrok_url}")
    
    # Configure Twilio number
    phone_number = setup_twilio_number(ngrok_url)
    if phone_number:
        print("\nSetup Complete!")
        print(f"Your emergency response system is running at: {ngrok_url}")
        print(f"Call {phone_number} to test your system")
        print("\nKeep this terminal running to maintain the ngrok tunnel")
        print("Press Ctrl+C to stop")
    else:
        print("Failed to configure Twilio number")

if __name__ == "__main__":
    main()