#!/bin/bash

# WeightCha NPM Publish Script
# Builds and publishes the WeightCha SDK to npm

set -e

echo "📦 WeightCha NPM Publisher"
echo "=========================="

# Change to web-sdk directory
cd "$(dirname "$0")/web-sdk"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Make sure you're in the web-sdk directory."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Check if npm is logged in
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged into npm. Please run 'npm login' first."
    exit 1
fi

echo "✅ NPM authentication verified"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.cache/

# Install dependencies
echo "📥 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Lint code
echo "🔍 Linting code..."
npm run lint

# Type check
echo "📝 Type checking..."
npm run type-check

# Build package
echo "🏗️  Building package..."
npm run build

# Check if build files exist
if [ ! -f "dist/weightcha.js" ]; then
    echo "❌ Build failed - dist files not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Test package locally
echo "🧪 Testing package..."
npm pack --dry-run

# Ask for version bump type
echo ""
echo "🏷️  Version Management"
echo "Current version: $CURRENT_VERSION"
echo ""
echo "Select version bump type:"
echo "1) patch (1.0.0 → 1.0.1) - Bug fixes"
echo "2) minor (1.0.0 → 1.1.0) - New features"
echo "3) major (1.0.0 → 2.0.0) - Breaking changes"
echo "4) Skip version bump"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        npm version patch
        ;;
    2)
        npm version minor
        ;;
    3)
        npm version major
        ;;
    4)
        echo "Skipping version bump"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")

# Confirm publication
echo ""
echo "🚀 Ready to publish!"
echo "Package: weightcha"
echo "Version: $NEW_VERSION"
echo "Registry: https://registry.npmjs.org"
echo ""
read -p "Proceed with publication? (y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    echo "📤 Publishing to npm..."
    
    # Publish package
    npm publish --access public
    
    echo ""
    echo "🎉 Successfully published weightcha@$NEW_VERSION!"
    echo ""
    echo "📋 Next steps:"
    echo "• Update documentation with new version"
    echo "• Create GitHub release: https://github.com/weightcha/weightcha/releases/new"
    echo "• Update CDN links in examples"
    echo "• Announce on Discord: https://discord.gg/weightcha"
    echo ""
    echo "📦 Install command:"
    echo "   npm install weightcha@$NEW_VERSION"
    echo ""
    echo "🔗 NPM package:"
    echo "   https://www.npmjs.com/package/weightcha"
    
    # Create git tag if version was bumped
    if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
        echo ""
        echo "🏷️  Creating git tag v$NEW_VERSION..."
        git add .
        git commit -m "chore: release v$NEW_VERSION" || true
        git tag "v$NEW_VERSION"
        echo "   Push with: git push origin main --tags"
    fi
    
else
    echo "❌ Publication cancelled"
    exit 1
fi
