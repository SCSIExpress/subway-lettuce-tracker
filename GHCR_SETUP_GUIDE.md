# 🐳 GitHub Container Registry (GHCR) Setup Guide

## Overview

This guide walks you through setting up GitHub Container Registry (GHCR) for the Subway Lettuce Tracker application. GHCR will automatically build and host your Docker images, making them available for deployment on any platform including Unraid.

## 🚀 Quick Setup

### Option 1: Automated Setup Script

```bash
# Run the setup script
./setup-ghcr.sh
```

### Option 2: Manual Setup

Follow the steps below for manual configuration.

## 📋 Prerequisites

- GitHub repository with the Subway Lettuce Tracker code
- Git configured with your GitHub account
- GitHub Actions enabled on your repository

## 🔧 Step-by-Step Setup

### 1. Enable GitHub Actions

GitHub Actions should be enabled by default, but verify:

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. If prompted, click **"I understand my workflows, go ahead and enable them"**

### 2. Verify Workflow Files

The following workflow files should be in your repository:

- `.github/workflows/build-and-push.yml` - Builds and pushes Docker images
- `.github/workflows/release.yml` - Handles releases and updates templates
- `.github/workflows/test.yml` - Runs tests before building

### 3. Configure Repository Settings

#### Enable Package Creation

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, ensure:
   - ✅ **Read and write permissions** is selected
   - ✅ **Allow GitHub Actions to create and approve pull requests** is checked

#### Package Visibility (After First Build)

After your first successful build:

1. Go to your repository's **Packages** tab
2. Click on each package (backend, frontend, aio)
3. Click **Package settings**
4. Set **Visibility** to **Public** (for public access)
5. Configure **Manage Actions access** as needed

### 4. Trigger Your First Build

#### Option A: Push to Main Branch

```bash
# Commit any pending changes
git add .
git commit -m "Add GHCR workflows and setup"

# Push to trigger build
git push origin main
```

#### Option B: Create a Release

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or use GitHub CLI
gh release create v1.0.0 --title "Initial Release" --notes "First release with GHCR support"
```

#### Option C: Manual Trigger

1. Go to **Actions** tab in your repository
2. Select **Build and Push to GHCR** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## 🔍 Verification

### 1. Check Build Status

1. Go to **Actions** tab
2. Verify the **Build and Push to GHCR** workflow completed successfully
3. Check for any error messages in the logs

### 2. Verify Packages

After successful build:

1. Go to your repository's main page
2. Look for **Packages** section on the right sidebar
3. You should see:
   - `your-repo-name-backend`
   - `your-repo-name-frontend`
   - `your-repo-name-aio`

### 3. Test Docker Images

```bash
# Login to GHCR (optional for public packages)
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull and test the all-in-one image
docker pull ghcr.io/YOUR_USERNAME/YOUR_REPO-aio:latest

# Run a quick test
docker run --rm -p 8080:8080 \
  -e VITE_GOOGLE_MAPS_API_KEY=test \
  -e POSTGRES_PASSWORD=test123 \
  -e REDIS_PASSWORD=test123 \
  ghcr.io/YOUR_USERNAME/YOUR_REPO-aio:latest
```

## 🏷️ Image Tags

The workflows create multiple tags for each image:

### Automatic Tags

- `latest` - Latest build from main branch
- `main` - Latest build from main branch
- `develop` - Latest build from develop branch
- `pr-123` - Pull request builds
- `v1.0.0` - Release tags
- `v1.0` - Major.minor version
- `v1` - Major version

### Usage Examples

```bash
# Latest stable release
docker pull ghcr.io/username/repo-aio:latest

# Specific version
docker pull ghcr.io/username/repo-aio:v1.0.0

# Development version
docker pull ghcr.io/username/repo-aio:develop
```

## 🔐 Authentication

### For Public Packages

No authentication required to pull public packages.

### For Private Packages

#### Personal Access Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens**
2. Click **Generate new token (classic)**
3. Select scopes:
   - `read:packages` (to pull images)
   - `write:packages` (to push images)
4. Copy the token

#### Docker Login

```bash
# Using personal access token
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Or interactively
docker login ghcr.io
# Username: YOUR_USERNAME
# Password: YOUR_PERSONAL_ACCESS_TOKEN
```

## 🔄 Automated Updates

### Unraid Templates

The workflows automatically update Unraid templates with:

- Correct repository URLs
- Latest image references
- Proper support links

Templates are available at:
```
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/unraid-templates/
```

### Release Process

When you create a release:

1. **Build and Push** workflow builds all images with release tags
2. **Release** workflow updates templates and creates deployment packages
3. GitHub release is created with download links and instructions

## 🚨 Troubleshooting

### Common Issues

#### 1. Build Fails with Permission Error

**Error**: `denied: permission_denied`

**Solution**: 
- Check repository **Actions** permissions
- Ensure **Read and write permissions** is enabled
- Verify **GITHUB_TOKEN** has package permissions

#### 2. Package Not Visible

**Error**: Package exists but can't be pulled

**Solution**:
- Go to package settings
- Set visibility to **Public**
- Check access permissions

#### 3. Docker Build Fails

**Error**: Build context or Dockerfile issues

**Solution**:
- Check Dockerfile syntax
- Verify build context paths
- Review build logs in Actions tab

#### 4. Template URLs Not Working

**Error**: Unraid templates point to wrong URLs

**Solution**:
- Wait for **Release** workflow to complete
- Check if templates were updated in the repository
- Manually update template URLs if needed

### Debug Commands

```bash
# Check repository information
git remote -v

# Verify workflow files
ls -la .github/workflows/

# Check current tags
git tag -l

# View recent commits
git log --oneline -10
```

## 📊 Monitoring

### GitHub Actions

Monitor your builds:
- **Actions** tab shows all workflow runs
- Click on individual runs for detailed logs
- Set up notifications for failed builds

### Package Usage

Track package downloads:
- Go to **Insights** → **Traffic** → **Git clones and visits**
- Package download statistics (if available)

### Automated Notifications

The workflows include:
- Build status notifications
- Release announcements
- Template update confirmations

## 🔧 Advanced Configuration

### Custom Build Arguments

Modify `.github/workflows/build-and-push.yml` to add build arguments:

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: ./${{ matrix.component }}
    file: ./${{ matrix.component }}/Dockerfile
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    build-args: |
      NODE_ENV=production
      BUILD_DATE=${{ steps.date.outputs.date }}
```

### Multi-Platform Builds

The workflows already include multi-platform builds:
- `linux/amd64` (Intel/AMD)
- `linux/arm64` (ARM, including Apple Silicon)

### Custom Registry

To use a different registry, modify the `REGISTRY` environment variable:

```yaml
env:
  REGISTRY: your-registry.com
  IMAGE_NAME: ${{ github.repository }}
```

## 📚 Additional Resources

- [GitHub Container Registry Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)

## 🎉 Success!

Once set up, your GHCR will:

✅ Automatically build Docker images on every push  
✅ Create tagged releases for versions  
✅ Update Unraid templates automatically  
✅ Provide multi-platform support  
✅ Enable easy deployment across platforms  

Your Docker images will be available at:
- `ghcr.io/YOUR_USERNAME/YOUR_REPO-backend:latest`
- `ghcr.io/YOUR_USERNAME/YOUR_REPO-frontend:latest`
- `ghcr.io/YOUR_USERNAME/YOUR_REPO-aio:latest`