# 🚀 AI Website Builder - Deployment Guide

This guide covers all the deployment options and commands available for the AI Website Builder application.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js 18+** installed
- **npm** or **yarn** package manager
- **Database** (PostgreSQL, MySQL, SQLite, etc.)
- **Environment variables** configured

## 🛠️ Available Commands

### 🌱 Database Seeding Commands

| Command | Description |
|---------|-------------|
| `npm run seed` | **Main deployment seed** - Runs all seeds (admin user + AI prompts) |
| `npm run seed:admin` | Create/update admin user only |
| `npm run seed:prompts` | Seed AI prompts only |
| `npm run seed:check` | Check existing admin users |
| `npm run seed:test` | Test admin API endpoints |

### 🚀 Deployment Commands

#### Linux/macOS (Bash)
| Command | Description |
|---------|-------------|
| `npm run deploy` | **Full deployment** (recommended for first-time setup) |
| `npm run deploy:quick` | Quick deployment (skip environment setup) |
| `npm run deploy:seed` | Run seeds only |
| `npm run deploy:build` | Build application only |
| `npm run deploy:start` | Start application only |
| `npm run deploy:test` | Run tests only |

#### Windows (Batch)
| Command | Description |
|---------|-------------|
| `npm run deploy:win` | **Full deployment** (recommended for first-time setup) |
| `npm run deploy:win:quick` | Quick deployment (skip environment setup) |
| `npm run deploy:win:seed` | Run seeds only |
| `npm run deploy:win:build` | Build application only |
| `npm run deploy:win:start` | Start application only |
| `npm run deploy:win:test` | Run tests only |

### 🗄️ Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push database schema |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

### 📊 Logging Commands

| Command | Description |
|---------|-------------|
| `npm run logs` | View recent logs |
| `npm run logs:list` | List all log files |
| `npm run logs:view` | View specific log file |
| `npm run logs:search` | Search logs |
| `npm run logs:tail` | Follow logs in real-time |

## 🎯 Deployment Scenarios

### 1. 🆕 First-Time Deployment

For a completely new deployment:

```bash
# Full deployment (recommended)
npm run deploy

# Or on Windows
npm run deploy:win
```

This will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Setup environment
- ✅ Setup database
- ✅ Run all seeds
- ✅ Build application
- ✅ Show deployment info

### 2. ⚡ Quick Deployment

For subsequent deployments (when environment is already set up):

```bash
# Quick deployment
npm run deploy:quick

# Or on Windows
npm run deploy:win:quick
```

This will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Setup database
- ✅ Run all seeds
- ✅ Build application
- ✅ Show deployment info

### 3. 🌱 Seeds Only

To run only the database seeds:

```bash
# Run seeds only
npm run deploy:seed

# Or on Windows
npm run deploy:win:seed
```

### 4. 🔨 Build Only

To build the application without running seeds:

```bash
# Build only
npm run deploy:build

# Or on Windows
npm run deploy:win:build
```

### 5. 🧪 Test Only

To run tests and linting:

```bash
# Run tests
npm run deploy:test

# Or on Windows
npm run deploy:win:test
```

## 🔧 Manual Deployment Steps

If you prefer to run commands manually:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

### Step 3: Setup Database
```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push
```

### Step 4: Run Seeds
```bash
# Run comprehensive deployment seed
npm run seed
```

### Step 5: Build Application
```bash
npm run build
```

### Step 6: Start Application
```bash
npm start
```

## 🌍 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="your_database_url"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"

# OAuth Providers
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# AI Providers
OPENAI_API_KEY="your_openai_api_key"
ANTHROPIC_API_KEY="your_anthropic_api_key"
GOOGLE_GEMINI_API_KEY="your_gemini_api_key"
CEREBRAS_API_KEY="your_cerebras_api_key"
CEREBRAS_MODEL="qwen-3-coder-480b"

# Admin User (Optional - defaults will be used if not set)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
ADMIN_NAME="Admin User"
```

## 🔐 Admin Access

After running the deployment seed, you'll have admin access:

- **Email**: `admin@example.com` (or your `ADMIN_EMAIL`)
- **Password**: `admin123` (or your `ADMIN_PASSWORD`)

### Admin Features:
- 📊 **Dashboard**: `/admin`
- 📝 **AI Prompts Management**: `/admin` → AI Prompts tab
- 👥 **User Management**: `/admin` → Users tab
- 📋 **Logs Management**: `/admin` → Logs tab
- ⚙️ **System Settings**: `/admin` → Settings tab

## 📊 Monitoring & Logs

### View Logs
```bash
# View recent logs
npm run logs

# List all log files
npm run logs:list

# Search logs
npm run logs:search

# Follow logs in real-time
npm run logs:tail
```

### Web-based Log Management
- Navigate to `/admin/logs` in your browser
- View, search, and download logs
- Monitor system health
- Track user activity

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check your DATABASE_URL in .env
   # Ensure database is running
   npm run db:push
   ```

2. **Prisma Client Not Generated**
   ```bash
   npm run db:generate
   ```

3. **Build Failed**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

4. **Admin User Not Created**
   ```bash
   # Run admin seed specifically
   npm run seed:admin
   ```

5. **AI Prompts Not Seeded**
   ```bash
   # Run prompts seed specifically
   npm run seed:prompts
   ```

### Getting Help

1. Check the logs: `npm run logs`
2. Verify environment variables
3. Ensure database is accessible
4. Check Node.js version (18+ required)

## 🎉 Post-Deployment

After successful deployment:

1. **Access your application** at the configured URL
2. **Sign in** with admin credentials
3. **Explore the admin dashboard** at `/admin`
4. **Monitor logs** at `/admin/logs`
5. **Test AI generation** features
6. **Configure additional settings** as needed

## 📈 Production Considerations

For production deployment:

1. **Use a production database** (PostgreSQL recommended)
2. **Set strong passwords** for admin users
3. **Configure proper environment variables**
4. **Set up monitoring and alerting**
5. **Regular backups** of your database
6. **SSL/HTTPS** configuration
7. **Load balancing** if needed
8. **CDN** for static assets

---

🎯 **Ready to deploy?** Run `npm run deploy` and follow the prompts!
