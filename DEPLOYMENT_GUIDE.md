# Complete Deployment Guide

This guide covers the complete deployment functionality for the AI Website Builder, including Vercel integration, project export, and live deployment features.

## Features Overview

### 🚀 Real Vercel Deployment
- **Direct Vercel API Integration**: Deploy projects directly to Vercel using their REST API
- **Live URLs**: Get real, live URLs for deployed projects
- **Automatic Project Creation**: Creates Vercel projects automatically
- **Real-time Status Updates**: Polls Vercel API for deployment status
- **Fallback Support**: Falls back to simulated deployment if Vercel API fails

### 📦 Project Export
- **Multi-Platform Support**: Export for Vercel, Netlify, GitHub Pages, AWS S3, Firebase
- **Platform-Specific Configuration**: Each export includes platform-specific config files
- **Deployment Scripts**: Includes ready-to-use deployment scripts
- **Complete Documentation**: Comprehensive README with deployment instructions

### 🎛️ Deployment Management
- **Deployment History**: Track all deployments with status and logs
- **Real-time Logs**: View deployment progress in real-time
- **Deployment Configuration**: Configure build settings, domains, and environment variables
- **Delete Deployments**: Remove old deployments from history

## Setup Instructions

### 1. Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Vercel API Token (Required for real Vercel deployments)
VERCEL_API_TOKEN="your-vercel-api-token"

# Optional: Other platform tokens
NETLIFY_API_TOKEN="your-netlify-api-token"
FIREBASE_PROJECT_ID="your-firebase-project-id"
```

### 2. Getting Vercel API Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Settings → Tokens
3. Create a new token with appropriate permissions
4. Copy the token and add it to your environment variables

### 3. Database Schema

The deployment system uses the following database models:

```prisma
model ProjectDeployment {
  id           String           @id @default(cuid())
  projectId    String
  platform     String
  branch       String           @default("main")
  customDomain String           @default("")
  status       DeploymentStatus @default(PENDING)
  url          String           @default("")
  commit       String           @default("")
  logs         Json             @default("[]")
  createdAt    DateTime         @default(now())
  completedAt  DateTime?
  project      Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

enum DeploymentStatus {
  PENDING
  BUILDING
  DEPLOYING
  SUCCESS
  FAILED
}
```

## API Endpoints

### Deployment Endpoints

#### Start Deployment
```http
POST /api/projects/[id]/deploy
Content-Type: application/json

{
  "platform": "vercel",
  "branch": "main",
  "customDomain": "example.com"
}
```

#### Get Deployment Status
```http
GET /api/projects/[id]/deployments/[deploymentId]
```

#### Delete Deployment
```http
DELETE /api/projects/[id]/deployments/[deploymentId]
```

#### Get Deployment Configuration
```http
GET /api/projects/[id]/deploy/config
```

#### Update Deployment Configuration
```http
POST /api/projects/[id]/deploy/config
Content-Type: application/json

{
  "platform": "vercel",
  "customDomain": "example.com",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "environmentVariables": {},
  "framework": "nextjs",
  "nodeVersion": "18"
}
```

### Export Endpoints

#### Export Project
```http
GET /api/projects/[id]/export?platform=vercel&format=zip
```

Supported platforms:
- `vercel` - Vercel-optimized export
- `netlify` - Netlify-optimized export
- `github-pages` - GitHub Pages with workflow
- `aws-s3` - AWS S3 static hosting
- `firebase` - Firebase Hosting

## Usage Examples

### 1. Deploy to Vercel

```typescript
// Start a Vercel deployment
const response = await fetch(`/api/projects/${projectId}/deploy`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'vercel',
    branch: 'main',
    customDomain: 'my-awesome-site.com'
  })
})

const { deployment } = await response.json()
console.log('Deployment started:', deployment.id)
```

### 2. Export Project for Vercel

```typescript
// Export project as Vercel-ready package
const response = await fetch(`/api/projects/${projectId}/export?platform=vercel`)
const blob = await response.blob()

// Download the ZIP file
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'project-vercel.zip'
a.click()
```

### 3. Monitor Deployment Status

```typescript
// Poll deployment status
const pollStatus = async (deploymentId: string) => {
  const response = await fetch(`/api/projects/${projectId}/deployments/${deploymentId}`)
  const { deployment } = await response.json()
  
  console.log('Status:', deployment.status)
  console.log('URL:', deployment.url)
  console.log('Logs:', deployment.logs)
  
  if (deployment.status === 'SUCCESS') {
    console.log('Deployment complete!', deployment.url)
  } else if (deployment.status === 'FAILED') {
    console.error('Deployment failed')
  } else {
    // Continue polling
    setTimeout(() => pollStatus(deploymentId), 2000)
  }
}
```

## Deployment Flow

### Vercel Deployment Process

1. **Project Validation**: Verify project exists and user has access
2. **Vercel Project Creation**: Create or find existing Vercel project
3. **File Preparation**: Convert project files to Vercel-compatible structure
4. **Deployment Initiation**: Start deployment via Vercel API
5. **Status Polling**: Poll Vercel API for deployment status
6. **URL Generation**: Get live URL from Vercel
7. **History Tracking**: Record deployment in database

### Export Process

1. **Platform Detection**: Determine target platform
2. **File Structure**: Create platform-specific file structure
3. **Configuration**: Add platform-specific config files
4. **Documentation**: Generate comprehensive README
5. **Scripts**: Include deployment scripts
6. **ZIP Creation**: Package everything into downloadable ZIP

## File Structure

### Vercel Export Structure
```
project-vercel.zip
├── package.json          # Next.js project configuration
├── next.config.js        # Next.js configuration
├── vercel.json          # Vercel deployment configuration
├── src/
│   ├── app/
│   │   ├── page.tsx     # Main page
│   │   └── layout.tsx   # Layout component
│   └── components/      # React components
├── public/              # Static assets
├── README.md           # Deployment instructions
├── deploy.sh           # Unix deployment script
└── deploy.bat          # Windows deployment script
```

### Netlify Export Structure
```
project-netlify.zip
├── package.json
├── netlify.toml         # Netlify configuration
├── src/                 # Source files
├── public/              # Static assets
├── README.md
├── deploy.sh
└── deploy.bat
```

### GitHub Pages Export Structure
```
project-github-pages.zip
├── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions workflow
├── src/                 # Source files
├── public/              # Static assets
├── README.md
├── deploy.sh
└── deploy.bat
```

## Error Handling

### Vercel API Errors
- **Token Invalid**: Falls back to simulated deployment
- **Project Creation Failed**: Uses existing project or falls back
- **Deployment Failed**: Records error in logs and database
- **Network Issues**: Retries with exponential backoff

### Export Errors
- **File Generation Failed**: Returns error response
- **ZIP Creation Failed**: Logs error and returns 500
- **Invalid Platform**: Returns 400 with error details

## Security Considerations

### API Token Security
- Store tokens in environment variables only
- Never expose tokens in client-side code
- Use server-side API calls for all deployments
- Implement proper error handling to avoid token leakage

### User Access Control
- Verify user ownership of projects
- Validate deployment permissions
- Log all deployment activities
- Implement rate limiting for API calls

## Monitoring and Logging

### Deployment Logs
- Real-time deployment progress
- Error messages and stack traces
- Performance metrics
- User activity tracking

### Database Logging
- Deployment history
- User actions
- Error tracking
- Performance monitoring

## Troubleshooting

### Common Issues

#### Vercel API Token Issues
```bash
# Check if token is set
echo $VERCEL_API_TOKEN

# Test token validity
curl -H "Authorization: Bearer $VERCEL_API_TOKEN" https://api.vercel.com/v1/projects
```

#### Deployment Failures
1. Check Vercel API token validity
2. Verify project files are valid
3. Check network connectivity
4. Review deployment logs

#### Export Issues
1. Ensure project has files
2. Check file permissions
3. Verify ZIP creation process
4. Test download functionality

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=vercel:*
NODE_ENV=development
```

## Performance Optimization

### Deployment Speed
- Parallel file processing
- Optimized ZIP creation
- Efficient API polling
- Cached project data

### Export Speed
- Streamed file processing
- Compressed ZIP files
- Optimized file structure
- Parallel downloads

## Future Enhancements

### Planned Features
- **Multi-Environment Deployments**: Deploy to staging and production
- **Custom Domains**: Automatic domain configuration
- **Environment Variables**: UI for managing env vars
- **Deployment Scheduling**: Scheduled deployments
- **Rollback Functionality**: Rollback to previous deployments
- **Performance Monitoring**: Built-in analytics
- **Team Collaboration**: Multi-user deployment management

### Integration Roadmap
- **GitHub Integration**: Automatic deployments on push
- **CI/CD Pipelines**: Custom build pipelines
- **Monitoring Tools**: Integration with monitoring services
- **Analytics**: Built-in analytics dashboard

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review deployment logs
3. Test with a simple project
4. Contact support with error details

## Contributing

To contribute to the deployment system:
1. Follow the existing code patterns
2. Add comprehensive tests
3. Update documentation
4. Test with multiple platforms
5. Ensure backward compatibility
