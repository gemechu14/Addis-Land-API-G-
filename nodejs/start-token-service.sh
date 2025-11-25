#!/bin/bash
# Startup script for Bank Token Service (Linux/Mac)

echo "========================================"
echo "Starting Bank Token Service"
echo "========================================"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
    echo ""
fi

# Check if private key exists
if [ ! -f "bank-private-key.pem" ]; then
    echo "WARNING: bank-private-key.pem not found!"
    echo "Please ensure the private key file is in the nodejs directory"
    exit 1
fi

echo "Starting token service..."
echo ""

# Start the service (server mode is now default)
node index.js

