#!/bin/bash

# Git and GitHub Setup Script for Subway Lettuce Tracker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header "Git and GitHub Setup for Subway Lettuce Tracker"

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "This doesn't appear to be the Subway Lettuce Tracker project directory."
    print_error "Please run this script from the project root directory."
    exit 1
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    print_status "Initializing Git repository..."
    git init
    git branch -m main
else
    print_status "Git repository already initialized"
fi

# Configure Git user if not set
if ! git config user.name > /dev/null 2>&1; then
    echo ""
    print_warning "Git user.name is not configured."
    read -p "Enter your full name (for Git commits): " GIT_NAME
    git config user.name "$GIT_NAME"
    print_status "Set Git user.name to: $GIT_NAME"
fi

if ! git config user.email > /dev/null 2>&1; then
    echo ""
    print_warning "Git user.email is not configured."
    read -p "Enter your email address (same as GitHub account): " GIT_EMAIL
    git config user.email "$GIT_EMAIL"
    print_status "Set Git user.email to: $GIT_EMAIL"
fi

# Show current Git configuration
echo ""
print_status "Current Git configuration:"
echo "Name: $(git config user.name)"
echo "Email: $(git config user.email)"

# Create .gitignore if it doesn't exist or is incomplete
print_status "Checking .gitignore file..."
if [ ! -f ".gitignore" ]; then
    print_warning ".gitignore not found, creating one..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
/backend/dist/
/frontend/dist/
/frontend/build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Docker
.dockerignore

# Temporary files
tmp/
temp/

# SSL certificates (keep structure, ignore actual certs)
nginx/ssl/*.pem
nginx/ssl/*.key
nginx/ssl/*.crt

# Backup files
*.backup
*.bak

# Test results
test-results/
playwright-report/
EOF
    print_status "Created .gitignore file"
fi

# Add all files to git
print_status "Adding files to Git..."
git add .

# Check if there are any files to commit
if git diff --staged --quiet; then
    print_warning "No changes to commit"
else
    print_status "Committing initial files..."
    git commit -m "Initial commit: Subway Lettuce Tracker with Docker and Unraid support

- Complete full-stack application with React frontend and Node.js backend
- PostgreSQL database with PostGIS for location data
- Redis caching for performance
- Docker Compose configurations for development and production
- Unraid XML templates for easy deployment
- GitHub Actions workflows for CI/CD and GHCR
- Comprehensive documentation and deployment guides"
fi

# GitHub repository setup
echo ""
print_header "GitHub Repository Setup"

print_status "Next steps to connect to GitHub:"
echo ""
echo "1. Create a new repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Repository name: subway-lettuce-tracker (or your preferred name)"
echo "   - Description: Location-based Subway lettuce quality tracker"
echo "   - Make it Public (for GHCR to work without authentication)"
echo "   - DON'T initialize with README, .gitignore, or license (we already have these)"
echo ""

echo "2. After creating the repository, GitHub will show you commands like:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "   git push -u origin main"
echo ""

read -p "Have you created the GitHub repository? (y/n): " REPO_CREATED

if [ "$REPO_CREATED" = "y" ] || [ "$REPO_CREATED" = "Y" ]; then
    echo ""
    read -p "Enter your GitHub username: " GITHUB_USER
    read -p "Enter your repository name (e.g., subway-lettuce-tracker): " REPO_NAME
    
    # Add remote origin
    REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
    print_status "Adding remote origin: $REPO_URL"
    
    if git remote get-url origin > /dev/null 2>&1; then
        print_warning "Remote origin already exists, updating..."
        git remote set-url origin "$REPO_URL"
    else
        git remote add origin "$REPO_URL"
    fi
    
    # Push to GitHub
    print_status "Pushing to GitHub..."
    echo ""
    print_warning "You may be prompted for your GitHub credentials."
    print_warning "If you have 2FA enabled, you'll need to use a Personal Access Token instead of your password."
    print_warning "Create one at: https://github.com/settings/tokens"
    echo ""
    
    if git push -u origin main; then
        print_status "✅ Successfully pushed to GitHub!"
        echo ""
        print_status "Your repository is now available at:"
        echo "https://github.com/$GITHUB_USER/$REPO_NAME"
        echo ""
        print_status "GitHub Actions will automatically start building your Docker images."
        print_status "Check the Actions tab in your repository to monitor the build."
        echo ""
        print_status "After the first successful build, your Docker images will be available at:"
        echo "- ghcr.io/$GITHUB_USER/$REPO_NAME-backend:latest"
        echo "- ghcr.io/$GITHUB_USER/$REPO_NAME-frontend:latest"
        echo "- ghcr.io/$GITHUB_USER/$REPO_NAME-aio:latest"
    else
        print_error "Failed to push to GitHub. Please check your credentials and try again."
        echo ""
        print_status "You can push manually later with:"
        echo "git push -u origin main"
    fi
else
    print_status "No problem! You can create the repository later and then run:"
    echo ""
    echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    echo "git push -u origin main"
fi

echo ""
print_header "Setup Complete!"

print_status "What's been set up:"
echo "✅ Git repository initialized"
echo "✅ Git user configuration"
echo "✅ .gitignore file created/verified"
echo "✅ Initial commit created"
echo "✅ GitHub Actions workflows ready"
echo "✅ Docker configurations ready"
echo "✅ Unraid templates ready"

echo ""
print_status "Next steps:"
echo "1. Create GitHub repository (if not done already)"
echo "2. Push code to GitHub"
echo "3. Monitor GitHub Actions for first build"
echo "4. Configure package visibility in GitHub"
echo "5. Test your Docker images"
echo "6. Deploy using Docker Compose or Unraid"

echo ""
print_status "For detailed GHCR setup instructions, see: GHCR_SETUP_GUIDE.md"
print_status "For Unraid deployment, see: UNRAID_DEPLOYMENT.md"