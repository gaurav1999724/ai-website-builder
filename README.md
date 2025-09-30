# AI Website Builder

A complete AI-powered website builder platform built with Next.js, TypeScript, and modern web technologies. Generate beautiful, responsive websites from simple text prompts using advanced AI models.

## 🚀 Features

### Core Functionality
- **AI-Powered Generation**: Generate complete websites from text prompts using OpenAI, Anthropic Claude, or Google Gemini
- **Live Code Editor**: Built-in Monaco Editor with syntax highlighting and IntelliSense
- **Real-time Preview**: See your changes instantly with live preview functionality
- **File Management**: VS Code-like file tree with drag-and-drop support
- **Project Export**: Download projects as ZIP files for deployment

### Authentication & Security
- **Multi-Provider Auth**: Support for email/password, Google, and GitHub authentication
- **Secure Sessions**: JWT-based authentication with NextAuth.js
- **Protected Routes**: Secure API endpoints and user data isolation

### User Experience
- **Modern UI**: Built with TailwindCSS, Shadcn/ui, and Framer Motion
- **Dark/Light Mode**: Theme switching with system preference detection
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Loading States**: Beautiful animated loading screens with progress tracking
- **Toast Notifications**: Real-time feedback with Sonner

### Project Management
- **Dashboard**: Overview of all projects with search and filtering
- **Project History**: Track all changes and generations
- **Incremental Updates**: Modify existing projects with new prompts
- **Auto-save**: Automatic saving of changes

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - App Router with TypeScript
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful, accessible UI components
- **Framer Motion** - Smooth animations and transitions
- **Monaco Editor** - VS Code-like code editor
- **React Query** - Server state management
- **Zustand** - Client state management

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Relational database
- **NextAuth.js** - Authentication framework

### AI Integration
- **Cerebras Qwen** - Advanced coding model (Default)
- **OpenAI GPT-4** - Advanced language model
- **Anthropic Claude** - AI assistant for code generation
- **Google Gemini** - Multimodal AI model

### Development Tools
- **TypeScript** - Type safety and better DX
- **ESLint** - Code linting and formatting
- **Prisma Studio** - Database management UI

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-website-builder.git
   cd ai-website-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/ai_website_builder"
   
   # NextAuth.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # OAuth Providers
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   
# AI API Keys
CEREBRAS_API_KEY="your-cerebras-api-key"
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
GOOGLE_GEMINI_API_KEY="your-google-gemini-api-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄 Database Schema

The application uses a PostgreSQL database with the following main entities:

- **Users**: Authentication and profile information
- **Projects**: Website projects with metadata
- **ProjectFiles**: Individual files within projects
- **ProjectGenerations**: AI generation history
- **ProjectHistory**: Activity tracking

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in with credentials
- `POST /api/auth/signup` - Create new account
- `GET /api/auth/session` - Get current session

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/projects/generate` - Generate website with AI
- `GET /api/projects/[id]/export` - Export project as ZIP

### Files
- `PUT /api/projects/[id]/files/[fileId]` - Update file content

## 🎨 UI Components

The application includes a comprehensive set of reusable UI components:

- **Layout Components**: Cards, headers, navigation
- **Form Components**: Inputs, buttons, textareas
- **Data Display**: Tables, lists, badges
- **Feedback**: Toasts, loading states, progress bars
- **Code Editor**: Monaco Editor integration
- **File Tree**: VS Code-like file explorer

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Railway
- Render
- AWS Amplify
- Netlify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Prisma](https://prisma.io/) - Database toolkit
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Framer Motion](https://www.framer.com/motion/) - Animation library

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Join our community Discord

---

Built with ❤️ by the AI Website Builder team
