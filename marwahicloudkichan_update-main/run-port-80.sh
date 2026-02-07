echo "🚀 Starting Narwahi Cloud Kitchen on port 80 (Production Mode)..."
echo "Note: Port 80 requires root privileges. Using sudo automatically."

# Change to the project directory
cd "$(dirname "$0")"

# Build the project first (production build)
echo "📦 Building project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Exiting..."
    exit 1
fi

echo "✅ Build successful! Starting server on port 80..."

# Use command line argument to specify port 80
sudo node dist/index.cjs --port=80