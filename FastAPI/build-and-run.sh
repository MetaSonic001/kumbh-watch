#!/bin/bash

# Crowd Detection API Docker Build and Run Script
# This script builds and runs the dockerized Crowd Detection API

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Check if docker-compose is available
check_docker_compose() {
    print_status "Checking Docker Compose availability..."
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        print_success "Using docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        print_success "Using docker compose (plugin)"
    else
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p uploads models logs
    
    print_success "Directories created"
}

# Build the Docker image
build_image() {
    print_status "Building Docker image..."
    
    if docker build -t crowd-detection-api:latest .; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
}

# Run with docker-compose
run_with_compose() {
    print_status "Starting services with Docker Compose..."
    
    if $COMPOSE_CMD up -d; then
        print_success "Services started successfully"
        print_status "API is available at: http://localhost:8000"
        print_status "API Documentation: http://localhost:8000/docs"
        print_status "Health Check: http://localhost:8000/health"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Run simple Docker container (alternative to compose)
run_simple() {
    print_status "Starting Docker container..."
    
    # Stop and remove existing container if it exists
    docker stop crowd-detection-backend 2>/dev/null || true
    docker rm crowd-detection-backend 2>/dev/null || true
    
    if docker run -d \
        --name crowd-detection-backend \
        -p 8000:8000 \
        -v "$(pwd)/uploads:/app/uploads" \
        -v "$(pwd)/models:/app/models" \
        -v "$(pwd)/logs:/app/logs" \
        --restart unless-stopped \
        crowd-detection-api:latest; then
        
        print_success "Container started successfully"
        print_status "API is available at: http://localhost:8000"
        print_status "API Documentation: http://localhost:8000/docs"
        print_status "Health Check: http://localhost:8000/health"
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Test the API
test_api() {
    print_status "Waiting for API to start..."
    sleep 10
    
    print_status "Testing API endpoints..."
    
    # Test health endpoint
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Health endpoint is working"
    else
        print_warning "Health endpoint is not responding yet"
    fi
    
    # Test zones endpoint
    if curl -f http://localhost:8000/zones/heatmap > /dev/null 2>&1; then
        print_success "Zones endpoint is working"
    else
        print_warning "Zones endpoint is not responding yet"
    fi
}

# Show logs
show_logs() {
    print_status "Showing container logs..."
    
    if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
        $COMPOSE_CMD logs -f crowd-detection-api
    else
        docker logs -f crowd-detection-backend
    fi
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    
    if [ -f "docker-compose.yml" ] && command -v $COMPOSE_CMD &> /dev/null; then
        $COMPOSE_CMD down
    else
        docker stop crowd-detection-backend 2>/dev/null || true
        docker rm crowd-detection-backend 2>/dev/null || true
    fi
    
    print_success "Services stopped"
}

# Main menu
show_menu() {
    echo ""
    echo "🚀 Crowd Detection API Docker Management"
    echo "========================================"
    echo "1) Build and run with Docker Compose (Recommended)"
    echo "2) Build and run simple Docker container"
    echo "3) Build image only"
    echo "4) Test API"
    echo "5) Show logs"
    echo "6) Stop services"
    echo "7) Exit"
    echo ""
}

# Main execution
main() {
    check_docker
    check_docker_compose
    create_directories
    
    # If arguments provided, run directly
    if [ $# -gt 0 ]; then
        case $1 in
            "build")
                build_image
                ;;
            "run")
                build_image
                run_with_compose
                ;;
            "simple")
                build_image
                run_simple
                ;;
            "test")
                test_api
                ;;
            "logs")
                show_logs
                ;;
            "stop")
                stop_services
                ;;
            *)
                echo "Usage: $0 [build|run|simple|test|logs|stop]"
                exit 1
                ;;
        esac
        return
    fi
    
    # Interactive mode
    while true; do
        show_menu
        read -p "Choose an option (1-7): " choice
        
        case $choice in
            1)
                build_image
                run_with_compose
                test_api
                ;;
            2)
                build_image
                run_simple
                test_api
                ;;
            3)
                build_image
                ;;
            4)
                test_api
                ;;
            5)
                show_logs
                ;;
            6)
                stop_services
                ;;
            7)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-7."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"