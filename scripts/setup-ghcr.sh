#!/bin/bash

# Subway Lettuce Tracker - GitHub Container Registry Setup Script
# This script helps you set up GHCR for your repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_header "GitHub Container Registry Setup"

# Check if git is available
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "This is not a Git repository. Please run this script from your project root."
    exit 1
fi

# Get repository information
REPO_URL=$(git config --get remote.origin.url)
if [[ $REPO_URL == *"github.com"* ]]; then
    # Extract owner/repo from URL
    if [[ $REPO_URL == *".git" ]]; then
        REPO_PATH=$(echo $REPO_URL | sed 's/.*github\.com[:/]\(.*\)\.git/\1/')
    else
        REPO_PATH=$(echo $REPO_URL | sed 's/.*github\.com[:/]\(.*\)/\1/')
    fi
    REPO_OWNER=$(echo $REPO_PATH | cut -d'/' -f1)
    REPO_NAME=$(echo $REPO_PATH | cut -d'/' -f2)
else
    print_error "This repository is not hosted on GitHub."
    exit 1
fi

print_status "Repository: $REPO_OWNER/$REPO_NAME"

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    print_status "GitHub CLI detected. Checking authentication..."
    if gh auth status &> /dev/null; then
        print_status "✓ GitHub CLI is authenticated"
        USE_GH_CLI=true
    else
        print_warning "GitHub CLI is not authenticated"
        USE_GH_CLI=false
    fi
else
    print_warning "GitHub CLI not found. Manual setup required."
    USE_GH_CLI=false
fi

print_header "GHCR Setup Steps"

echo "To set up GitHub Container Registry for your repository, you need to:"
echo ""
echo "1. Enable GitHub Actions (if not already enabled)"
echo "2. Set up repository secrets (if needed)"
echo "3. Configure package permissions"
echo "4. Push code to trigger the first build"

# Step 1: Check GitHub Actions
print_status "Step 1: Checking GitHub Actions..."
if [ -d ".github/workflows" ]; then
    print_status "✓ GitHub Actions workflows found"
    echo "   - build-and-push.yml: Builds and pushes Docker images"
    echo "   - release.yml: Handles releases and template updates"
    echo "   - test.yml: Runs tests before building"
else
    print_error "GitHub Actions workflows not found!"
    exit 1
fi

# Step 2: Repository secrets
print_status "Step 2: Repository Secrets"
echo "The workflows use GITHUB_TOKEN which is automatically provided."
echo "No additional secrets are required for basic GHCR functionality."

if [ "$USE_GH_CLI" = true ]; then
    print_status "Checking existing secrets..."
    SECRETS=$(gh secret list --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null || echo "")
    if [ -n "$SECRETS" ]; then
        echo "Existing secrets:"
        echo "$SECRETS"
    else
        echo "No custom secrets found (this is normal for GHCR)."
    fi
fi

# Step 3: Package permissions
print_status "Step 3: Package Permissions"
echo "After the first successful build, you may need to:"
echo "1. Go to https://github.com/$REPO_OWNER/$REPO_NAME/packages"
echo "2. Click on each package (backend, frontend, aio)"
echo "3. Go to 'Package settings'"
echo "4. Set visibility to 'Public' if you want public access"
echo "5. Configure access permissions as needed"

# Step 4: Trigger first build
print_status "Step 4: Trigger First Build"
echo "To trigger the first build and create your GHCR packages:"

if git status --porcelain | grep -q .; then
    print_warning "You have uncommitted changes. Commit them first:"
    echo ""
    echo "git add ."
    echo "git commit -m \"Add GHCR workflows and setup\""
    echo "git push origin main"
else
    print_status "No uncommitted changes detected."
    echo ""
    echo "Push your current changes to trigger the build:"
    echo "git push origin main"
fi

echo ""
print_status "Or create a release to trigger both build and release workflows:"
echo "git tag v1.0.0"
echo "git push origin v1.0.0"

if [ "$USE_GH_CLI" = true ]; then
    echo ""
    echo "Or use GitHub CLI to create a release:"
    echo "gh release create v1.0.0 --title \"Initial Release\" --notes \"First release with GHCR support\""
fi

# Step 5: Verify setup
print_header "Verification Steps"
echo "After pushing your code, verify the setup:"
echo ""
echo "1. Check GitHub Actions:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo ""
echo "2. Check packages after successful build:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/packages"
echo ""
echo "3. Your Docker images will be available at:"
echo "   - ghcr.io/$REPO_OWNER/$REPO_NAME-backend:latest"
echo "   - ghcr.io/$REPO_OWNER/$REPO_NAME-frontend:latest"
echo "   - ghcr.io/$REPO_OWNER/$REPO_NAME-aio:latest"

# Docker login instructions
print_header "Docker Login (Optional)"
echo "To pull/push images manually, authenticate with GHCR:"
echo ""
echo "1. Create a Personal Access Token:"
echo "   https://github.com/settings/tokens"
echo "   - Select 'read:packages' and 'write:packages' scopes"
echo ""
echo "2. Login to GHCR:"
echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u $REPO_OWNER --password-stdin"
echo ""
echo "3. Test pulling an image (after first build):"
echo "   docker pull ghcr.io/$REPO_OWNER/$REPO_NAME-aio:latest"

# Unraid template update
print_header "Unraid Templates"
echo "The workflows will automatically update your Unraid templates with:"
echo "- Correct repository URLs"
echo "- Proper image references"
echo "- Updated support links"
echo ""
echo "Templates will be available at:"
echo "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/unraid-templates/"

# Final instructions
print_header "Next Steps"
echo "1. Review the generated workflows in .github/workflows/"
echo "2. Commit and push your changes"
echo "3. Monitor the Actions tab for the first build"
echo "4. Configure package visibility after first successful build"
echo "5. Test your Docker images"
echo "6. Share your Unraid templates with the community"

print_status "Setup complete! Push your changes to get started."