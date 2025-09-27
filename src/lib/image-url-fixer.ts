// Utility to fix broken image URLs in HTML content
// This helps fix existing projects that have local image references

export interface ImageReplacement {
  pattern: RegExp
  replacement: string
  description: string
}

// Common image patterns and their replacements
export const imageReplacements: ImageReplacement[] = [
  // Food/Restaurant images
  {
    pattern: /assets\/images\/chef\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
    description: 'Chef image'
  },
  {
    pattern: /assets\/images\/dish[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800&h=600&fit=crop',
    description: 'Dish image'
  },
  {
    pattern: /assets\/images\/food[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',
    description: 'Food image'
  },
  {
    pattern: /assets\/images\/restaurant[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=600&fit=crop',
    description: 'Restaurant image'
  },
  
  // Business/Corporate images
  {
    pattern: /assets\/images\/business[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
    description: 'Business image'
  },
  {
    pattern: /assets\/images\/office[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop',
    description: 'Office image'
  },
  {
    pattern: /assets\/images\/team[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
    description: 'Team image'
  },
  
  // Technology images
  {
    pattern: /assets\/images\/tech[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop',
    description: 'Technology image'
  },
  {
    pattern: /assets\/images\/computer[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop',
    description: 'Computer image'
  },
  {
    pattern: /assets\/images\/laptop[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
    description: 'Laptop image'
  },
  
  // Portfolio/Creative images
  {
    pattern: /assets\/images\/portfolio[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    description: 'Portfolio image'
  },
  {
    pattern: /assets\/images\/design[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    description: 'Design image'
  },
  {
    pattern: /assets\/images\/creative[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=600&fit=crop',
    description: 'Creative image'
  },
  
  // Generic placeholder images
  {
    pattern: /assets\/images\/placeholder[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://picsum.photos/800/600?random=1',
    description: 'Placeholder image'
  },
  {
    pattern: /assets\/images\/image[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://picsum.photos/800/600?random=2',
    description: 'Generic image'
  },
  {
    pattern: /assets\/images\/photo[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://picsum.photos/800/600?random=3',
    description: 'Photo image'
  },
  
  // Hero/Banner images
  {
    pattern: /assets\/images\/hero[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://picsum.photos/1200/600?random=4',
    description: 'Hero image'
  },
  {
    pattern: /assets\/images\/banner[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://picsum.photos/1200/400?random=5',
    description: 'Banner image'
  },
  
  // Profile/Avatar images
  {
    pattern: /assets\/images\/profile[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    description: 'Profile image'
  },
  {
    pattern: /assets\/images\/avatar[0-9]*\.(jpg|jpeg|png|gif)/gi,
    replacement: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    description: 'Avatar image'
  }
]

/**
 * Fix broken image URLs in HTML content
 * @param htmlContent - The HTML content to fix
 * @returns Fixed HTML content with working image URLs
 */
export function fixImageUrls(htmlContent: string): string {
  let fixedContent = htmlContent
  
  // Apply all image replacements
  imageReplacements.forEach(replacement => {
    const matches = fixedContent.match(replacement.pattern)
    if (matches) {
      console.log(`Fixing ${matches.length} ${replacement.description} references`)
      fixedContent = fixedContent.replace(replacement.pattern, replacement.replacement)
    }
  })
  
  // Also fix any remaining generic local image paths
  const genericImagePattern = /assets\/images\/[^"'\s]+\.(jpg|jpeg|png|gif)/gi
  const genericMatches = fixedContent.match(genericImagePattern)
  if (genericMatches) {
    console.log(`Fixing ${genericMatches.length} generic local image references`)
    fixedContent = fixedContent.replace(genericImagePattern, 'https://picsum.photos/800/600?random=99')
  }
  
  return fixedContent
}

/**
 * Check if HTML content has broken image references
 * @param htmlContent - The HTML content to check
 * @returns Array of broken image references found
 */
export function findBrokenImageReferences(htmlContent: string): string[] {
  const brokenImages: string[] = []
  
  // Find all local image references
  const localImagePattern = /assets\/images\/[^"'\s]+\.(jpg|jpeg|png|gif)/gi
  const matches = htmlContent.match(localImagePattern)
  
  if (matches) {
    brokenImages.push(...matches)
  }
  
  return brokenImages
}

/**
 * Get statistics about image fixes applied
 * @param originalContent - Original HTML content
 * @param fixedContent - Fixed HTML content
 * @returns Statistics about the fixes applied
 */
export function getImageFixStats(originalContent: string, fixedContent: string): {
  totalBrokenImages: number
  fixedImages: number
  brokenImageList: string[]
} {
  const brokenImages = findBrokenImageReferences(originalContent)
  const fixedImages = findBrokenImageReferences(fixedContent)
  
  return {
    totalBrokenImages: brokenImages.length,
    fixedImages: brokenImages.length - fixedImages.length,
    brokenImageList: brokenImages
  }
}
