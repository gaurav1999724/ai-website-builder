# AI Website Builder - Setup Guide

This guide will help you set up and run the AI Website Builder platform locally.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MySQL** (v8.0 or higher)
- **Git**

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-website-builder.git
cd ai-website-builder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/ai_website_builder"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# AI API Keys (At least one required)
CEREBRAS_API_KEY="your-cerebras-api-key"
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
GOOGLE_GEMINI_API_KEY="your-google-gemini-api-key"
```

### 4. Set Up the Database

Create a MySQL database:

```sql
CREATE DATABASE ai_website_builder;
```

Run Prisma migrations:

```bash
npx prisma generate
npx prisma db push
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Detailed Setup

### Database Configuration

1. **Install MySQL**
   - Download from [mysql.com](https://dev.mysql.com/downloads/)
   - Or use Docker: `docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 -d mysql:8.0`

2. **Create Database**
   ```sql
   CREATE DATABASE ai_website_builder;
   CREATE USER 'ai_builder'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON ai_website_builder.* TO 'ai_builder'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **Update DATABASE_URL**
   ```env
   DATABASE_URL="mysql://ai_builder:your_password@localhost:3306/ai_website_builder"
   ```

### AI API Setup

#### Cerebras (Default)
1. Go to [Cerebras Platform](https://www.cerebras.net/)
2. Create an account and get your API key
3. Add to `.env.local`:
   ```env
   CEREBRAS_API_KEY="csk-..."
   ```

#### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Add to `.env.local`:
   ```env
   OPENAI_API_KEY="sk-..."
   ```

#### Anthropic Claude
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account and get your API key
3. Add to `.env.local`:
   ```env
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

#### Google Gemini
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env.local`:
   ```env
   GOOGLE_GEMINI_API_KEY="AI..."
   ```

### OAuth Setup (Optional)

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Add to `.env.local`:
   ```env
   GITHUB_CLIENT_ID="your-client-id"
   GITHUB_CLIENT_SECRET="your-client-secret"
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── projects/          # Project pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── code-editor/      # Code editor components
│   └── providers.tsx     # Context providers
├── lib/                  # Utility libraries
│   ├── ai/              # AI integration
│   ├── auth.ts          # Authentication config
│   ├── prisma.ts        # Database client
│   └── utils.ts         # Utility functions
└── types/               # TypeScript type definitions
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL is running
   - Verify DATABASE_URL format
   - Ensure database exists

2. **AI API Errors**
   - Verify API keys are correct
   - Check API quotas and limits
   - Ensure you have credits/billing set up

3. **OAuth Errors**
   - Check redirect URIs match exactly
   - Verify client IDs and secrets
   - Ensure OAuth apps are properly configured

4. **Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all environment variables are set

### Getting Help

- Check the [README.md](README.md) for detailed documentation
- Open an issue on GitHub for bugs
- Join our community Discord for support

## Production Deployment

### Environment Variables for Production

```env
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret"
DATABASE_URL="your-production-database-url"
# ... other production variables
```

### Deployment Platforms

- **Vercel** (Recommended)
- **Railway**
- **Render**
- **AWS Amplify**

See the main README.md for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
