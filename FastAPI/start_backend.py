#!/usr/bin/env python3
"""
Simple startup script for the Crowd Detection Backend
"""

import subprocess
import sys
import time
import requests

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'fastapi', 'uvicorn', 'websockets', 'opencv-python', 
        'ultralytics', 'numpy', 'scipy', 'pillow', 'python-multipart', 'aiofiles'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\n🚨 Missing packages: {', '.join(missing_packages)}")
        print("Installing missing packages...")
        
        try:
            subprocess.run([sys.executable, "-m", "pip", "install"] + missing_packages, check=True)
            print("✅ All packages installed successfully!")
        except subprocess.CalledProcessError:
            print("❌ Failed to install packages. Please install manually:")
            print(f"pip install {' '.join(missing_packages)}")
            return False
    
    return True

def start_server():
    """Start the FastAPI server"""
    print("\n🚀 Starting Crowd Detection Backend...")
    
    try:
        # Start the server
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
        
        print("✅ Server started successfully!")
        print("🌐 Backend URL: http://localhost:8000")
        print("📚 API Docs: http://localhost:8000/docs")
        print("🔍 Health Check: http://localhost:8000/health")
        print("\n💡 To test the API:")
        print("   curl http://localhost:8000/health")
        print("   curl http://localhost:8000/")
        
        print("\n⏹️  Press Ctrl+C to stop the server")
        
        # Wait for the process to complete
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down server...")
        if process:
            process.terminate()
            process.wait()
        print("✅ Server stopped")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return False
    
    return True

def test_endpoints():
    """Test basic endpoints"""
    print("\n🧪 Testing endpoints...")
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
            data = response.json()
            print(f"   Status: {data.get('status')}")
            print(f"   Zones: {data.get('zones_count')}")
            print(f"   Cameras: {data.get('cameras_count')}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            
        # Test zones endpoint
        response = requests.get("http://localhost:8000/zones/heatmap", timeout=5)
        if response.status_code == 200:
            print("✅ Zones endpoint working")
            zones = response.json()
            print(f"   Found {len(zones)} zones")
        else:
            print(f"❌ Zones endpoint failed: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running?")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    print("🔧 Crowd Detection Backend Startup")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("❌ Dependency check failed. Exiting.")
        sys.exit(1)
    
    # Start server
    if start_server():
        print("✅ Backend startup completed successfully!")
    else:
        print("❌ Backend startup failed!")
        sys.exit(1) 