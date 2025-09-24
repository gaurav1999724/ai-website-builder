export interface Component {
  id: string
  name: string
  description: string
  category: 'ui' | 'layout' | 'form' | 'navigation' | 'media' | 'data'
  code: {
    html: string
    css: string
    js?: string
  }
  preview: string
  tags: string[]
  dependencies?: string[]
}

export const COMPONENT_LIBRARY: Component[] = [
  // UI Components
  {
    id: 'button-primary',
    name: 'Primary Button',
    description: 'A modern primary button with hover effects',
    category: 'ui',
    code: {
      html: `<button class="btn-primary">
  <span class="btn-text">Click Me</span>
  <span class="btn-icon">→</span>
</button>`,
      css: `.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}`,
      js: `document.querySelectorAll('.btn-primary').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    // Add your click handler here
    console.log('Primary button clicked!');
  });
});`
    },
    preview: 'A gradient button with hover animation',
    tags: ['button', 'gradient', 'hover', 'animation']
  },
  
  {
    id: 'card-modern',
    name: 'Modern Card',
    description: 'A sleek card component with shadow and hover effects',
    category: 'ui',
    code: {
      html: `<div class="card-modern">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <span class="card-badge">New</span>
  </div>
  <div class="card-content">
    <p class="card-description">This is a modern card component with beautiful styling and smooth animations.</p>
  </div>
  <div class="card-footer">
    <button class="btn-secondary">Learn More</button>
  </div>
</div>`,
      css: `.card-modern {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  max-width: 400px;
}

.card-modern:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.card-header {
  padding: 20px 20px 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a202c;
}

.card-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.card-content {
  padding: 16px 20px;
}

.card-description {
  margin: 0;
  color: #4a5568;
  line-height: 1.6;
}

.card-footer {
  padding: 0 20px 20px;
}

.btn-secondary {
  background: transparent;
  border: 2px solid #667eea;
  color: #667eea;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #667eea;
  color: white;
}`
    },
    preview: 'A modern card with header, content, and footer',
    tags: ['card', 'shadow', 'hover', 'modern']
  },

  // Navigation Components
  {
    id: 'navbar-modern',
    name: 'Modern Navbar',
    description: 'A responsive navigation bar with mobile menu',
    category: 'navigation',
    code: {
      html: `<nav class="navbar-modern">
  <div class="nav-container">
    <div class="nav-brand">
      <img src="logo.svg" alt="Logo" class="nav-logo">
      <span class="nav-title">Your Brand</span>
    </div>
    <div class="nav-menu" id="navMenu">
      <a href="#home" class="nav-link">Home</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#services" class="nav-link">Services</a>
      <a href="#contact" class="nav-link">Contact</a>
    </div>
    <button class="nav-toggle" id="navToggle">
      <span class="hamburger"></span>
      <span class="hamburger"></span>
      <span class="hamburger"></span>
    </button>
  </div>
</nav>`,
      css: `.navbar-modern {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: all 0.3s ease;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-logo {
  height: 32px;
  width: auto;
}

.nav-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a202c;
}

.nav-menu {
  display: flex;
  gap: 32px;
  align-items: center;
}

.nav-link {
  color: #4a5568;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
}

.nav-link:hover {
  color: #667eea;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: #667eea;
  transition: width 0.3s ease;
}

.nav-link:hover::after {
  width: 100%;
}

.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.hamburger {
  width: 24px;
  height: 2px;
  background: #4a5568;
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .nav-menu {
    position: fixed;
    top: 70px;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 20px;
    gap: 20px;
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .nav-menu.active {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
  
  .nav-toggle {
    display: flex;
  }
}`,
      js: `document.addEventListener('DOMContentLoaded', function() {
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  
  navToggle.addEventListener('click', function() {
    navMenu.classList.toggle('active');
  });
  
  // Close menu when clicking on a link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
      navMenu.classList.remove('active');
    });
  });
});`
    },
    preview: 'A responsive navigation bar with mobile menu',
    tags: ['navbar', 'responsive', 'mobile', 'navigation']
  },

  // Form Components
  {
    id: 'form-modern',
    name: 'Modern Form',
    description: 'A beautiful form with floating labels and validation',
    category: 'form',
    code: {
      html: `<form class="form-modern">
  <div class="form-group">
    <input type="text" id="name" class="form-input" required>
    <label for="name" class="form-label">Full Name</label>
    <span class="form-error">Please enter your full name</span>
  </div>
  
  <div class="form-group">
    <input type="email" id="email" class="form-input" required>
    <label for="email" class="form-label">Email Address</label>
    <span class="form-error">Please enter a valid email</span>
  </div>
  
  <div class="form-group">
    <textarea id="message" class="form-input form-textarea" required></textarea>
    <label for="message" class="form-label">Message</label>
    <span class="form-error">Please enter your message</span>
  </div>
  
  <button type="submit" class="btn-submit">
    <span>Send Message</span>
    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
    </svg>
  </button>
</form>`,
      css: `.form-modern {
  max-width: 500px;
  margin: 0 auto;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.form-group {
  position: relative;
  margin-bottom: 32px;
}

.form-input {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: transparent;
  outline: none;
}

.form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:focus + .form-label,
.form-input:not(:placeholder-shown) + .form-label {
  transform: translateY(-24px) scale(0.85);
  color: #667eea;
}

.form-label {
  position: absolute;
  left: 20px;
  top: 16px;
  color: #a0aec0;
  font-size: 16px;
  transition: all 0.3s ease;
  pointer-events: none;
  background: white;
  padding: 0 4px;
}

.form-textarea {
  min-height: 120px;
  resize: vertical;
}

.form-error {
  display: none;
  color: #e53e3e;
  font-size: 14px;
  margin-top: 8px;
}

.form-input:invalid:not(:focus):not(:placeholder-shown) + .form-label + .form-error {
  display: block;
}

.btn-submit {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-icon {
  width: 20px;
  height: 20px;
}`
    },
    preview: 'A modern form with floating labels and validation',
    tags: ['form', 'validation', 'floating-labels', 'modern']
  }
]

export function getComponentsByCategory(category: string): Component[] {
  return COMPONENT_LIBRARY.filter(component => component.category === category)
}

export function getComponentById(id: string): Component | undefined {
  return COMPONENT_LIBRARY.find(component => component.id === id)
}

export function searchComponents(query: string): Component[] {
  const lowercaseQuery = query.toLowerCase()
  return COMPONENT_LIBRARY.filter(component => 
    component.name.toLowerCase().includes(lowercaseQuery) ||
    component.description.toLowerCase().includes(lowercaseQuery) ||
    component.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
}
