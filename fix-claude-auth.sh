#!/bin/bash

# Fix Claude authentication on AWS Lightsail

echo "🔧 Fixing Claude authentication..."

# Check current credentials
echo "Current credentials file:"
cat ~/.claude/.credentials.json

# Remove old credentials
echo "Removing expired credentials..."
rm -f ~/.claude/.credentials.json

# Re-authenticate
echo "Starting re-authentication..."
claude auth

echo "✅ Authentication complete!"
echo "Try running 'claude' again to verify it works."