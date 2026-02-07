#!/bin/bash
# Load environment variables from .env file
set -a
source .env
set +a

# Run the development server
NODE_ENV=development npm run dev
