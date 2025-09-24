# Admin System Setup Guide

## Overview

The AI Website Builder now includes a comprehensive role-based authentication system with an admin dashboard for managing AI prompts dynamically.

## Features

### 🔐 Role-Based Authentication
- **USER**: Default role for regular users
- **ADMIN**: Can access admin dashboard and manage AI prompts
- **SUPER_ADMIN**: Full administrative access

### 🎛️ Admin Dashboard
- **Overview**: System statistics and user metrics
- **AI Prompts Management**: Create, edit, delete, and toggle AI prompts
- **User Management**: View all users and their roles
- **Settings**: System configuration and health monitoring

### 🤖 Dynamic AI Prompts
- AI prompts are now stored in the database instead of hardcoded
- Admins can edit prompts through the web interface
- Support for different providers (OpenAI, Anthropic, Gemini, Cerebras)
- Support for different types (Website Generation, Website Modification, Chat Assistant)

## Setup Instructions

### 1. Database Migration
The database schema has been updated with new tables:
- `User` model now includes `role` and `isActive` fields
- New `AIPrompt` model for storing dynamic prompts
- New enums: `UserRole`, `AIProvider`, `PromptType`

Run the following commands:
```bash
npx prisma db push
npx prisma generate
```

### 2. Seed Default Prompts
Populate the database with default AI prompts:
```bash
npx tsx src/scripts/seed-prompts.ts
```

### 3. Create Admin User
Create an admin user account:
```bash
npx tsx src/scripts/create-admin.ts admin@example.com admin123 "Admin User"
```

### 4. Access Admin Dashboard
1. Sign in with the admin credentials
2. Navigate to `/admin` or click the "Admin" button in the dashboard header
3. Start managing AI prompts and users

## API Endpoints

### Admin Endpoints
- `GET /api/admin/prompts` - Fetch all AI prompts
- `POST /api/admin/prompts` - Create new AI prompt
- `PUT /api/admin/prompts/[id]` - Update AI prompt
- `PATCH /api/admin/prompts/[id]` - Toggle prompt status
- `DELETE /api/admin/prompts/[id]` - Delete AI prompt
- `GET /api/admin/users` - Fetch all users

### Public Endpoints
- `GET /api/ai/prompts?provider=OPENAI&type=WEBSITE_GENERATION` - Fetch active prompts

## Security Features

### Middleware Protection
- Admin routes (`/admin/*`) are protected by middleware
- Admin API routes (`/api/admin/*`) require admin role
- Automatic redirect to dashboard for unauthorized users

### Role Verification
- All admin endpoints verify user role before processing
- Session includes user role information
- Database queries include role-based filtering

## Usage Examples

### Creating a New AI Prompt
1. Go to Admin Dashboard → AI Prompts tab
2. Click "Add New Prompt"
3. Fill in the details:
   - **Name**: Unique identifier (e.g., `custom-website-gen`)
   - **Provider**: AI provider (OPENAI, ANTHROPIC, GEMINI, CEREBRAS)
   - **Type**: Prompt type (WEBSITE_GENERATION, WEBSITE_MODIFICATION, CHAT_ASSISTANT)
   - **Title**: Display name
   - **Description**: Brief description
   - **System Prompt**: The actual prompt template
4. Click "Save"

### Editing Existing Prompts
1. Find the prompt in the AI Prompts list
2. Click the "Edit" button
3. Modify the fields as needed
4. Click "Save"

### Toggling Prompt Status
- Click the eye icon to activate/deactivate prompts
- Only active prompts are used by the AI system

## Dynamic Prompt System

The AI system now fetches prompts from the database instead of using hardcoded values:

1. **Prompt Helper**: `src/lib/ai/prompt-helper.ts` handles prompt fetching
2. **Fallback System**: If no database prompt is found, falls back to default prompts
3. **Provider Support**: Different prompts for different AI providers
4. **Type Support**: Different prompts for different use cases

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── page.tsx                 # Admin dashboard
│   └── api/
│       ├── admin/
│       │   ├── prompts/
│       │   │   ├── route.ts         # CRUD operations for prompts
│       │   │   └── [id]/route.ts    # Individual prompt operations
│       │   └── users/
│       │       └── route.ts         # User management
│       └── ai/
│           └── prompts/
│               └── route.ts         # Public prompt fetching
├── lib/
│   └── ai/
│       └── prompt-helper.ts         # Dynamic prompt fetching
├── scripts/
│   ├── seed-prompts.ts              # Seed default prompts
│   └── create-admin.ts              # Create admin user
└── middleware.ts                    # Route protection
```

## Troubleshooting

### Common Issues

1. **"Forbidden" Error**: User doesn't have admin role
   - Solution: Create admin user or update existing user role

2. **Prompts Not Loading**: Database not seeded
   - Solution: Run `npx tsx src/scripts/seed-prompts.ts`

3. **Admin Button Not Showing**: User role not in session
   - Solution: Sign out and sign back in to refresh session

### Database Issues

If you encounter Prisma client generation issues:
```bash
# Delete node_modules/.prisma and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

## Security Considerations

1. **Admin Access**: Only users with ADMIN or SUPER_ADMIN roles can access admin features
2. **API Protection**: All admin API endpoints verify user roles
3. **Session Management**: User roles are included in JWT tokens
4. **Database Security**: Sensitive operations are logged for audit trails

## Future Enhancements

- [ ] User role management from admin dashboard
- [ ] Prompt versioning and rollback
- [ ] Prompt performance analytics
- [ ] Bulk prompt operations
- [ ] Prompt templates and categories
- [ ] Advanced user permissions (read-only admin, etc.)
