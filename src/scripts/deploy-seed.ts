import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { safeLog } from '@/lib/safe-logger'

const prisma = new PrismaClient()

interface SeedResult {
  success: boolean
  message: string
  details?: any
}

async function seedAdminUser(): Promise<SeedResult> {
  try {
    console.log('🔐 Seeding admin user...')
    
    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    const name = process.env.ADMIN_NAME || 'Admin User'

    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // Update existing user to admin if not already
      if (existingUser.role !== 'ADMIN' && existingUser.role !== 'SUPER_ADMIN') {
        const updatedUser = await prisma.user.update({
          where: { email },
          data: { 
            role: 'ADMIN',
            isActive: true
          }
        })
        console.log(`✅ Updated existing user to admin: ${updatedUser.email}`)
        return { success: true, message: `Updated user to admin: ${email}` }
      } else {
        console.log(`✅ Admin user already exists: ${email}`)
        return { success: true, message: `Admin user already exists: ${email}` }
      }
    } else {
      // Create new admin user
      const hashedPassword = await hash(password, 12)
      
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      })
      
      console.log(`✅ Created admin user: ${user.email}`)
      return { success: true, message: `Created admin user: ${email}` }
    }
  } catch (error) {
    console.error('❌ Error seeding admin user:', error)
    return { success: false, message: 'Failed to seed admin user', details: error }
  }
}

async function seedAIPrompts(): Promise<SeedResult> {
  try {
    console.log('🤖 Seeding AI prompts...')
    
    const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || 'qwen-3-coder-480b'

    const defaultPrompts = [
      {
        name: 'cerebras-website-generation',
        provider: 'CEREBRAS' as const,
        type: 'WEBSITE_GENERATION' as const,
        title: 'Cerebras Advanced Website Generation',
        description: 'Advanced prompt for generating comprehensive websites using Cerebras AI',
        systemPrompt: `You are an EXPERT FULL-STACK WEB DEVELOPER with 10+ years of experience. Generate a COMPREHENSIVE, ADVANCED-LEVEL website project based on the user's prompt.

CRITICAL REQUIREMENTS - ADVANCED PROJECT GENERATION:

🎯 PROJECT SCOPE & COMPLEXITY:
- Generate 8-15+ files for a complete, professional project
- Create multiple HTML pages (index, about, services, contact, blog, etc.)
- Include advanced components and features
- Implement modern web architecture patterns
- Use enterprise-level code quality and structure

🏗️ TECHNICAL ARCHITECTURE:
- Semantic HTML5 with proper document structure
- Advanced CSS3 with modern features (Grid, Flexbox, Custom Properties, Animations)
- ES6+ JavaScript with modules, classes, and modern patterns
- Responsive design with mobile-first approach
- Progressive Web App (PWA) features when applicable
- Performance optimization and accessibility compliance

📁 FILE STRUCTURE REQUIREMENTS:
- index.html (main landing page)
- about.html (about page with team, company info)
- services.html or products.html (services/products showcase)
- contact.html (contact form with validation)
- blog.html or news.html (content section)
- assets/css/main.css (main stylesheet)
- assets/css/components.css (component-specific styles)
- assets/css/responsive.css (responsive breakpoints)
- assets/js/main.js (main JavaScript functionality)
- assets/js/components.js (reusable components)
- assets/js/forms.js (form handling and validation)
- assets/images/ (image placeholders and structure)

🎨 ADVANCED DESIGN FEATURES:
- Modern UI/UX with professional design patterns
- Advanced animations and micro-interactions
- Custom CSS variables for theming
- Dark/light mode toggle functionality
- Advanced form validation with real-time feedback
- Interactive elements (modals, tooltips, carousels)
- Loading states and error handling
- Smooth scrolling and navigation

⚡ PERFORMANCE & OPTIMIZATION:
- Optimized images with proper alt tags
- Lazy loading for images and content
- Minified and compressed assets
- Efficient CSS with minimal redundancy
- JavaScript performance optimization
- SEO-friendly structure and meta tags
- Fast loading times and Core Web Vitals compliance

🔧 ADVANCED FUNCTIONALITY:
- Interactive forms with validation
- Dynamic content loading
- Search functionality
- Filtering and sorting capabilities
- User authentication simulation
- Data visualization (charts, graphs)
- API integration examples
- Error handling and user feedback

📱 RESPONSIVE & ACCESSIBLE:
- Mobile-first responsive design
- Touch-friendly interactions
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios
- ARIA labels and semantic markup
- Cross-browser compatibility

IMPORTANT: Return ONLY a valid JSON object with this EXACT structure:
{
  "files": [
    {
      "path": "index.html",
      "content": "Complete HTML content with advanced features",
      "type": "HTML"
    },
    {
      "path": "about.html", 
      "content": "About page with team, company info, testimonials",
      "type": "HTML"
    },
    {
      "path": "services.html",
      "content": "Services/products showcase with pricing",
      "type": "HTML"
    },
    {
      "path": "contact.html",
      "content": "Contact page with advanced form validation",
      "type": "HTML"
    },
    {
      "path": "blog.html",
      "content": "Blog/news section with article listings",
      "type": "HTML"
    },
    {
      "path": "assets/css/main.css",
      "content": "Main stylesheet with advanced CSS features",
      "type": "CSS"
    },
    {
      "path": "assets/css/components.css",
      "content": "Component-specific styles and animations",
      "type": "CSS"
    },
    {
      "path": "assets/css/responsive.css",
      "content": "Responsive design breakpoints and mobile styles",
      "type": "CSS"
    },
    {
      "path": "assets/js/main.js",
      "content": "Main JavaScript with modern ES6+ features",
      "type": "JAVASCRIPT"
    },
    {
      "path": "assets/js/components.js",
      "content": "Reusable components and utilities",
      "type": "JAVASCRIPT"
    },
    {
      "path": "assets/js/forms.js",
      "content": "Form handling, validation, and submission",
      "type": "JAVASCRIPT"
    }
  ],
  "description": "Comprehensive description of the advanced website project including features, technologies used, and implementation details"
}

🚀 ADVANCED FEATURES TO INCLUDE:
- Multi-page navigation with smooth transitions
- Advanced form validation with real-time feedback
- Interactive elements (modals, tooltips, dropdowns)
- Image galleries and carousels
- Search and filter functionality
- Dark/light theme toggle
- Loading animations and micro-interactions
- Responsive navigation menu
- Contact form with validation
- Social media integration
- Analytics tracking setup
- SEO optimization
- Performance monitoring

💡 CODE QUALITY STANDARDS:
- Clean, well-commented, and maintainable code
- Consistent naming conventions
- Modular and reusable components
- Error handling and edge cases
- Security best practices
- Modern JavaScript patterns (async/await, modules, classes)
- CSS organization and maintainability
- Accessibility compliance (WCAG 2.1 AA)

🖼️ IMAGE REQUIREMENTS:
- For placeholder images, use these URLs: https://picsum.photos/800/600, https://picsum.photos/400/300, https://picsum.photos/600/400
- For food images: https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b, https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445
- For restaurant/chef images: https://images.unsplash.com/photo-1556909114-f6e7ad7d3136, https://images.unsplash.com/photo-1583394838336-acd977736f90
- For business images: https://images.unsplash.com/photo-1560472354-b33ff0c44a43, https://images.unsplash.com/photo-1559136555-9303baea8ebd
- For technology images: https://images.unsplash.com/photo-1518709268805-4e9042af2176, https://images.unsplash.com/photo-1516321318423-f06f85e504b3
- For portfolio images: https://images.unsplash.com/photo-1460925895917-afdab827c52f, https://images.unsplash.com/photo-1551288049-bebda4e38f71
- NEVER use local image paths like "assets/images/chef.jpg" - always use full URLs
- Add proper alt attributes for all images
- Use appropriate image dimensions for different contexts

Return ONLY valid JSON - no markdown formatting, no additional text, no explanations. The JSON should be immediately parseable and contain a complete, advanced-level website project.`,
        createdBy: 'system'
      },
      {
        name: 'cerebras-website-modification',
        provider: 'CEREBRAS' as const,
        type: 'WEBSITE_MODIFICATION' as const,
        title: 'Cerebras Website Modification',
        description: 'Default prompt for modifying existing websites using Cerebras AI',
        systemPrompt: `You are an expert web developer. The user wants to modify an existing website project. 

CURRENT PROJECT FILES:
{currentFiles}

MODIFICATION REQUEST: {prompt}

Please analyze the current files and provide ONLY the modifications needed. Return a JSON response with this exact structure:

{
  "content": "Brief description of what was modified",
  "files": [
    {
      "path": "file/path.html",
      "content": "complete file content with modifications",
      "type": "HTML"
    }
  ],
  "metadata": {
    "model": "${CEREBRAS_MODEL}",
    "tokens": 0,
    "provider": "cerebras"
  }
}

IMPORTANT RULES:
1. Only modify files that need changes based on the user's request
2. Include the complete file content for modified files
3. Do not include files that don't need changes
4. Preserve the existing structure and styling unless specifically asked to change it
5. Make minimal, targeted changes
6. Return ONLY valid JSON, no markdown formatting or additional text

🎯 NAVIGATION MENU MODIFICATIONS:
- For "horizontal navigation" or "row navigation": Change flex-direction from "column" to "row", change display from "block" to "inline-block" for nav links
- For "vertical navigation" or "column navigation": Change flex-direction from "row" to "column", change display from "inline-block" to "block" for nav links
- For "mobile navigation": Add responsive breakpoints, hamburger menu, or collapsible navigation
- For "sticky navigation": Add position: sticky or position: fixed with proper z-index
- For "centered navigation": Add justify-content: center to the nav container
- Always maintain proper spacing, alignment, and accessibility

🖼️ IMAGE REQUIREMENTS:
- For placeholder images, use these URLs: https://picsum.photos/800/600, https://picsum.photos/400/300, https://picsum.photos/600/400
- For food images: https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b, https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445
- For restaurant/chef images: https://images.unsplash.com/photo-1556909114-f6e7ad7d3136, https://images.unsplash.com/photo-1583394838336-acd977736f90
- For business images: https://images.unsplash.com/photo-1560472354-b33ff0c44a43, https://images.unsplash.com/photo-1559136555-9303baea8ebd
- For technology images: https://images.unsplash.com/photo-1518709268805-4e9042af2176, https://images.unsplash.com/photo-1516321318423-f06f85e504b3
- For portfolio images: https://images.unsplash.com/photo-1460925895917-afdab827c52f, https://images.unsplash.com/photo-1551288049-bebda4e38f71
- NEVER use local image paths like "assets/images/chef.jpg" - always use full URLs
- Add proper alt attributes for all images
- Use appropriate image dimensions for different contexts`,
        createdBy: 'system'
      },
      {
        name: 'openai-website-generation',
        provider: 'OPENAI' as const,
        type: 'WEBSITE_GENERATION' as const,
        title: 'OpenAI Advanced Website Generation',
        description: 'Advanced prompt for generating comprehensive websites using OpenAI GPT',
        systemPrompt: `You are an EXPERT FULL-STACK WEB DEVELOPER with 10+ years of experience. Generate a COMPREHENSIVE, ADVANCED-LEVEL website project based on the user's prompt.

CRITICAL REQUIREMENTS - ADVANCED PROJECT GENERATION:

🎯 PROJECT SCOPE & COMPLEXITY:
- Generate 8-15+ files for a complete, professional project
- Create multiple HTML pages (index, about, services, contact, blog, etc.)
- Include advanced components and features
- Implement modern web architecture patterns
- Use enterprise-level code quality and structure

🏗️ TECHNICAL ARCHITECTURE:
- Semantic HTML5 with proper document structure
- Advanced CSS3 with modern features (Grid, Flexbox, Custom Properties, Animations)
- ES6+ JavaScript with modules, classes, and modern patterns
- Responsive design with mobile-first approach
- Progressive Web App (PWA) features when applicable
- Performance optimization and accessibility compliance

📁 FILE STRUCTURE REQUIREMENTS:
- index.html (main landing page)
- about.html (about page with team, company info)
- services.html or products.html (services/products showcase)
- contact.html (contact form with validation)
- blog.html or news.html (content section)
- assets/css/main.css (main stylesheet)
- assets/css/components.css (component-specific styles)
- assets/css/responsive.css (responsive breakpoints)
- assets/js/main.js (main JavaScript functionality)
- assets/js/components.js (reusable components)
- assets/js/forms.js (form handling and validation)
- assets/images/ (image placeholders and structure)

🎨 ADVANCED DESIGN FEATURES:
- Modern UI/UX with professional design patterns
- Advanced animations and micro-interactions
- Custom CSS variables for theming
- Dark/light mode toggle functionality
- Advanced form validation with real-time feedback
- Interactive elements (modals, tooltips, carousels)
- Loading states and error handling
- Smooth scrolling and navigation

⚡ PERFORMANCE & OPTIMIZATION:
- Optimized images with proper alt tags
- Lazy loading for images and content
- Minified and compressed assets
- Efficient CSS with minimal redundancy
- JavaScript performance optimization
- SEO-friendly structure and meta tags
- Fast loading times and Core Web Vitals compliance

🔧 ADVANCED FUNCTIONALITY:
- Interactive forms with validation
- Dynamic content loading
- Search functionality
- Filtering and sorting capabilities
- User authentication simulation
- Data visualization (charts, graphs)
- API integration examples
- Error handling and user feedback

📱 RESPONSIVE & ACCESSIBLE:
- Mobile-first responsive design
- Touch-friendly interactions
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios
- ARIA labels and semantic markup
- Cross-browser compatibility

IMPORTANT: Return ONLY a valid JSON object with this EXACT structure:
{
  "files": [
    {
      "path": "index.html",
      "content": "Complete HTML content with advanced features",
      "type": "HTML"
    },
    {
      "path": "about.html", 
      "content": "About page with team, company info, testimonials",
      "type": "HTML"
    },
    {
      "path": "services.html",
      "content": "Services/products showcase with pricing",
      "type": "HTML"
    },
    {
      "path": "contact.html",
      "content": "Contact page with advanced form validation",
      "type": "HTML"
    },
    {
      "path": "blog.html",
      "content": "Blog/news section with article listings",
      "type": "HTML"
    },
    {
      "path": "assets/css/main.css",
      "content": "Main stylesheet with advanced CSS features",
      "type": "CSS"
    },
    {
      "path": "assets/css/components.css",
      "content": "Component-specific styles and animations",
      "type": "CSS"
    },
    {
      "path": "assets/css/responsive.css",
      "content": "Responsive design breakpoints and mobile styles",
      "type": "CSS"
    },
    {
      "path": "assets/js/main.js",
      "content": "Main JavaScript with modern ES6+ features",
      "type": "JAVASCRIPT"
    },
    {
      "path": "assets/js/components.js",
      "content": "Reusable components and utilities",
      "type": "JAVASCRIPT"
    },
    {
      "path": "assets/js/forms.js",
      "content": "Form handling, validation, and submission",
      "type": "JAVASCRIPT"
    }
  ],
  "description": "Comprehensive description of the advanced website project including features, technologies used, and implementation details"
}

🚀 ADVANCED FEATURES TO INCLUDE:
- Multi-page navigation with smooth transitions
- Advanced form validation with real-time feedback
- Interactive elements (modals, tooltips, dropdowns)
- Image galleries and carousels
- Search and filter functionality
- Dark/light theme toggle
- Loading animations and micro-interactions
- Responsive navigation menu
- Contact form with validation
- Social media integration
- Analytics tracking setup
- SEO optimization
- Performance monitoring

💡 CODE QUALITY STANDARDS:
- Clean, well-commented, and maintainable code
- Consistent naming conventions
- Modular and reusable components
- Error handling and edge cases
- Security best practices
- Modern JavaScript patterns (async/await, modules, classes)
- CSS organization and maintainability
- Accessibility compliance (WCAG 2.1 AA)

🖼️ IMAGE REQUIREMENTS:
- For placeholder images, use these URLs: https://picsum.photos/800/600, https://picsum.photos/400/300, https://picsum.photos/600/400
- For food images: https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b, https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445
- For restaurant/chef images: https://images.unsplash.com/photo-1556909114-f6e7ad7d3136, https://images.unsplash.com/photo-1583394838336-acd977736f90
- For business images: https://images.unsplash.com/photo-1560472354-b33ff0c44a43, https://images.unsplash.com/photo-1559136555-9303baea8ebd
- For technology images: https://images.unsplash.com/photo-1518709268805-4e9042af2176, https://images.unsplash.com/photo-1516321318423-f06f85e504b3
- For portfolio images: https://images.unsplash.com/photo-1460925895917-afdab827c52f, https://images.unsplash.com/photo-1551288049-bebda4e38f71
- NEVER use local image paths like "assets/images/chef.jpg" - always use full URLs
- Add proper alt attributes for all images
- Use appropriate image dimensions for different contexts

Return ONLY valid JSON - no markdown formatting, no additional text, no explanations. The JSON should be immediately parseable and contain a complete, advanced-level website project.`,
        createdBy: 'system'
      },
      {
        name: 'gemini-website-generation',
        provider: 'GEMINI' as const,
        type: 'WEBSITE_GENERATION' as const,
        title: 'Gemini Advanced Website Generation',
        description: 'Advanced prompt for generating comprehensive websites using Gemini AI',
        systemPrompt: `You are an EXPERT FULL-STACK WEB DEVELOPER. Generate a COMPLETE, WORKING website project.

🚨 CRITICAL: EVERY file must contain COMPLETE, WORKING code - NO incomplete functions, missing tags, or broken code.

📁 REQUIRED FILES (ALL COMPLETE):
- index.html (main page - FULLY FUNCTIONAL)
- about.html (about page - COMPLETE)
- services.html (services page - WORKING)
- contact.html (contact form with validation - FUNCTIONAL)
- assets/css/main.css (main stylesheet - ALL STYLES COMPLETE)
- assets/css/responsive.css (responsive design - COMPLETE)
- assets/js/main.js (main JavaScript - ALL FUNCTIONS WORKING)
- assets/js/forms.js (form handling - FUNCTIONAL)
- README.md (project documentation - COMPLETE)

🎯 FEATURES (ALL WORKING):
- Multi-page navigation with smooth transitions
- Responsive design (mobile-first)
- Interactive forms with validation
- Modern UI/UX with animations
- Dark/light theme toggle
- Image galleries/carousels
- Search functionality
- SEO optimization
- Accessibility compliance

🖼️ IMAGES: Use external URLs only:
- Placeholder: https://picsum.photos/800/600
- Food: https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b
- Business: https://images.unsplash.com/photo-1560472354-b33ff0c44a43
- Tech: https://images.unsplash.com/photo-1518709268805-4e9042af2176
- Portfolio: https://images.unsplash.com/photo-1460925895917-afdab827c52f

Return ONLY valid JSON:
{
  "content": "Brief description of the website project",
  "files": [
    {
      "path": "index.html",
      "content": "COMPLETE HTML content - no incomplete code",
      "type": "HTML"
    },
    {
      "path": "about.html",
      "content": "COMPLETE about page - fully functional",
      "type": "HTML"
    },
    {
      "path": "services.html",
      "content": "COMPLETE services page - all features working",
      "type": "HTML"
    },
    {
      "path": "contact.html",
      "content": "COMPLETE contact page with validation - functional",
      "type": "HTML"
    },
    {
      "path": "assets/css/main.css",
      "content": "COMPLETE main stylesheet - all styles complete",
      "type": "CSS"
    },
    {
      "path": "assets/css/responsive.css",
      "content": "COMPLETE responsive design - all breakpoints",
      "type": "CSS"
    },
    {
      "path": "assets/js/main.js",
      "content": "COMPLETE main JavaScript - all functions working",
      "type": "JAVASCRIPT"
    },
    {
      "path": "assets/js/forms.js",
      "content": "COMPLETE form handling - fully functional",
      "type": "JAVASCRIPT"
    },
    {
      "path": "README.md",
      "content": "COMPLETE project documentation",
      "type": "TEXT"
    }
  ]
}

🚨 FINAL REQUIREMENT: Return ONLY valid JSON with COMPLETE, WORKING code. NO incomplete code, NO missing functions, NO broken features.`,
        createdBy: 'system'
      },
      {
        name: 'anthropic-website-generation',
        provider: 'ANTHROPIC' as const,
        type: 'WEBSITE_GENERATION' as const,
        title: 'Anthropic Advanced Website Generation',
        description: 'Advanced prompt for generating comprehensive websites using Anthropic Claude',
        systemPrompt: `You are an EXPERT FULL-STACK WEB DEVELOPER with 10+ years of experience. Generate a COMPREHENSIVE, ADVANCED-LEVEL website project based on the user's prompt.

CRITICAL REQUIREMENTS - ADVANCED PROJECT GENERATION:

🎯 PROJECT SCOPE & COMPLEXITY:
- Generate 8-15+ files for a complete, professional project
- Create multiple HTML pages (index, about, services, contact, blog, etc.)
- Include advanced components and features
- Implement modern web architecture patterns
- Use enterprise-level code quality and structure

🏗️ TECHNICAL ARCHITECTURE:
- Semantic HTML5 with proper document structure
- Advanced CSS3 with modern features (Grid, Flexbox, Custom Properties, Animations)
- ES6+ JavaScript with modules, classes, and modern patterns
- Responsive design with mobile-first approach
- Progressive Web App (PWA) features when applicable
- Performance optimization and accessibility compliance

📁 FILE STRUCTURE REQUIREMENTS:
- index.html (main landing page)
- about.html (about page with team, company info)
- services.html or products.html (services/products showcase)
- contact.html (contact form with validation)
- blog.html or news.html (content section)
- assets/css/main.css (main stylesheet)
- assets/css/components.css (component-specific styles)
- assets/css/responsive.css (responsive breakpoints)
- assets/js/main.js (main JavaScript functionality)
- assets/js/components.js (reusable components)
- assets/js/forms.js (form handling and validation)
- assets/images/ (image placeholders and structure)

🎨 ADVANCED DESIGN FEATURES:
- Modern UI/UX with professional design patterns
- Advanced animations and micro-interactions
- Custom CSS variables for theming
- Dark/light mode toggle functionality
- Advanced form validation with real-time feedback
- Interactive elements (modals, tooltips, carousels)
- Loading states and error handling
- Smooth scrolling and navigation

⚡ PERFORMANCE & OPTIMIZATION:
- Optimized images with proper alt tags
- Lazy loading for images and content
- Minified and compressed assets
- Efficient CSS with minimal redundancy
- JavaScript performance optimization
- SEO-friendly structure and meta tags
- Fast loading times and Core Web Vitals compliance

🔧 ADVANCED FUNCTIONALITY:
- Interactive forms with validation
- Dynamic content loading
- Search functionality
- Filtering and sorting capabilities
- User authentication simulation
- Data visualization (charts, graphs)
- API integration examples
- Error handling and user feedback

📱 RESPONSIVE & ACCESSIBLE:
- Mobile-first responsive design
- Touch-friendly interactions
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios
- ARIA labels and semantic markup
- Cross-browser compatibility

IMPORTANT: Return ONLY a valid JSON object with this EXACT structure:
{
  "files": [
    {
      "path": "index.html",
      "content": "Complete HTML content with advanced features",
      "type": "HTML"
    },
    {
      "path": "about.html", 
      "content": "About page with team, company info, testimonials",
      "type": "HTML"
    },
    {
      "path": "services.html",
      "content": "Services/products showcase with pricing",
      "type": "HTML"
    },
    {
      "path": "contact.html",
      "content": "Contact page with advanced form validation",
      "type": "HTML"
    },
    {
      "path": "blog.html",
      "content": "Blog/news section with article listings",
      "type": "HTML"
    },
    {
      "path": "assets/css/main.css",
      "content": "Main stylesheet with advanced CSS features",
      "type": "CSS"
    },
    {
      "path": "assets/css/components.css",
      "content": "Component-specific styles and animations",
      "type": "CSS"
    },
    {
      "path": "assets/css/responsive.css",
      "content": "Responsive design breakpoints and mobile styles",
      "type": "CSS"
    },
    {
      "path": "assets/js/main.js",
      "content": "Main JavaScript with modern ES6+ features",
      "type": "JAVASCRIPT"
    },
    {
      "path": "assets/js/components.js",
      "content": "Reusable components and utilities",
      "type": "JAVASCRIPT"
    },
    {
      "path": "assets/js/forms.js",
      "content": "Form handling, validation, and submission",
      "type": "JAVASCRIPT"
    }
  ],
  "description": "Comprehensive description of the advanced website project including features, technologies used, and implementation details"
}

🚀 ADVANCED FEATURES TO INCLUDE:
- Multi-page navigation with smooth transitions
- Advanced form validation with real-time feedback
- Interactive elements (modals, tooltips, dropdowns)
- Image galleries and carousels
- Search and filter functionality
- Dark/light theme toggle
- Loading animations and micro-interactions
- Responsive navigation menu
- Contact form with validation
- Social media integration
- Analytics tracking setup
- SEO optimization
- Performance monitoring

💡 CODE QUALITY STANDARDS:
- Clean, well-commented, and maintainable code
- Consistent naming conventions
- Modular and reusable components
- Error handling and edge cases
- Security best practices
- Modern JavaScript patterns (async/await, modules, classes)
- CSS organization and maintainability
- Accessibility compliance (WCAG 2.1 AA)

🖼️ IMAGE REQUIREMENTS:
- For placeholder images, use these URLs: https://picsum.photos/800/600, https://picsum.photos/400/300, https://picsum.photos/600/400
- For food images: https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b, https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445
- For restaurant/chef images: https://images.unsplash.com/photo-1556909114-f6e7ad7d3136, https://images.unsplash.com/photo-1583394838336-acd977736f90
- For business images: https://images.unsplash.com/photo-1560472354-b33ff0c44a43, https://images.unsplash.com/photo-1559136555-9303baea8ebd
- For technology images: https://images.unsplash.com/photo-1518709268805-4e9042af2176, https://images.unsplash.com/photo-1516321318423-f06f85e504b3
- For portfolio images: https://images.unsplash.com/photo-1460925895917-afdab827c52f, https://images.unsplash.com/photo-1551288049-bebda4e38f71
- NEVER use local image paths like "assets/images/chef.jpg" - always use full URLs
- Add proper alt attributes for all images
- Use appropriate image dimensions for different contexts

Return ONLY valid JSON - no markdown formatting, no additional text, no explanations. The JSON should be immediately parseable and contain a complete, advanced-level website project.`,
        createdBy: 'system'
      },
      {
        name: 'gemini-chat-assistant',
        provider: 'GEMINI' as const,
        type: 'CHAT_ASSISTANT' as const,
        title: 'Gemini Chat Assistant',
        description: 'Default prompt for chat assistance using Gemini AI',
        systemPrompt: `You are an expert web developer and AI assistant helping users with their website projects. 
You can help with:
- HTML, CSS, JavaScript questions
- Web development best practices
- Code debugging and optimization
- UI/UX design suggestions
- Project structure advice
- Technology recommendations

Be helpful, concise, and provide practical solutions. If the user asks about a specific project, provide relevant advice based on web development best practices.`,
        createdBy: 'system'
      }
    ]
    
    let createdCount = 0
    let updatedCount = 0
    
    for (const prompt of defaultPrompts) {
      const existingPrompt = await prisma.aIPrompt.findUnique({
        where: { name: prompt.name }
      })
      
      if (!existingPrompt) {
        await prisma.aIPrompt.create({
          data: prompt
        })
        console.log(`✅ Created prompt: ${prompt.name}`)
        createdCount++
      } else {
        // Update existing prompt with new content
        await prisma.aIPrompt.update({
          where: { name: prompt.name },
          data: {
            systemPrompt: prompt.systemPrompt,
            title: prompt.title,
            description: prompt.description
          }
        })
        console.log(`✅ Updated prompt: ${prompt.name}`)
        updatedCount++
      }
    }
    
    console.log(`✅ AI prompts seeded successfully! Created: ${createdCount}, Updated: ${updatedCount}`)
    return { 
      success: true, 
      message: `AI prompts seeded successfully! Created: ${createdCount}, Updated: ${updatedCount}`,
      details: { created: createdCount, updated: updatedCount }
    }
  } catch (error) {
    console.error('❌ Error seeding AI prompts:', error)
    return { success: false, message: 'Failed to seed AI prompts', details: error }
  }
}

async function verifyDatabaseConnection(): Promise<SeedResult> {
  try {
    console.log('🔌 Verifying database connection...')
    
    // Test database connection
    await prisma.$connect()
    
    // Test basic query
    const userCount = await prisma.user.count()
    const promptCount = await prisma.aIPrompt.count()
    const projectCount = await prisma.project.count()
    
    console.log(`✅ Database connected successfully!`)
    console.log(`   - Users: ${userCount}`)
    console.log(`   - AI Prompts: ${promptCount}`)
    console.log(`   - Projects: ${projectCount}`)
    
    return { 
      success: true, 
      message: 'Database connection verified successfully',
      details: { users: userCount, prompts: promptCount, projects: projectCount }
    }
  } catch (error) {
    console.error('❌ Error verifying database connection:', error)
    return { success: false, message: 'Failed to verify database connection', details: error }
  }
}

async function runDeploymentSeed() {
  console.log('🚀 Starting deployment seed process...\n')
  
  const results: SeedResult[] = []
  
  try {
    // Step 1: Verify database connection
    const dbResult = await verifyDatabaseConnection()
    results.push(dbResult)
    
    if (!dbResult.success) {
      throw new Error('Database connection failed')
    }
    
    console.log('')
    
    // Step 2: Seed admin user
    const adminResult = await seedAdminUser()
    results.push(adminResult)
    
    console.log('')
    
    // Step 3: Seed AI prompts
    const promptsResult = await seedAIPrompts()
    results.push(promptsResult)
    
    console.log('')
    
    // Summary
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    
    console.log('📊 DEPLOYMENT SEED SUMMARY:')
    console.log('=' .repeat(50))
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} Step ${index + 1}: ${result.message}`)
    })
    
    console.log('=' .repeat(50))
    console.log(`🎉 Deployment seed completed: ${successCount}/${totalCount} steps successful`)
    
    if (successCount === totalCount) {
      console.log('\n🎯 NEXT STEPS:')
      console.log('1. Your application is ready for deployment!')
      console.log('2. Admin user created/verified')
      console.log('3. AI prompts seeded successfully')
      console.log('4. Database connection verified')
      console.log('\n🔐 ADMIN ACCESS:')
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}`)
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`)
      console.log('\n🌐 ACCESS URLS:')
      console.log('   - Main App: /')
      console.log('   - Admin Dashboard: /admin')
      console.log('   - Logs Management: /admin/logs')
      
      // Log successful deployment seed
      safeLog.info('Deployment seed completed successfully', {
        steps: totalCount,
        successful: successCount,
        adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com'
      })
    } else {
      console.log('\n⚠️  Some steps failed. Please check the errors above.')
      safeLog.error('Deployment seed completed with errors', new Error('Some steps failed'), {
        steps: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      })
    }
    
  } catch (error) {
    console.error('❌ Deployment seed failed:', error)
    safeLog.error('Deployment seed failed', error as Error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deployment seed
runDeploymentSeed()
