/**
 * Utility functions for HTML content processing and completion
 */

export interface HTMLFile {
  path: string
  content: string
  type: string
  size: number
}

/**
 * Ensures HTML content is complete and properly structured
 */
export function ensureCompleteHTML(content: string, filePath: string): string {
  if (!content || content.trim().length === 0) {
    return createBasicHTMLStructure()
  }

  let htmlContent = content.trim()

  // If content is very short, create a basic structure
  if (htmlContent.length < 50) {
    return createBasicHTMLStructure()
  }

  // Check if HTML is already complete - if so, return as-is
  const hasDoctype = htmlContent.toLowerCase().startsWith('<!doctype')
  const hasHtml = htmlContent.toLowerCase().includes('<html') && htmlContent.toLowerCase().includes('</html>')
  const hasHead = htmlContent.toLowerCase().includes('<head') && htmlContent.toLowerCase().includes('</head>')
  const hasBody = htmlContent.toLowerCase().includes('<body') && htmlContent.toLowerCase().includes('</body>')
  
  // If HTML is already complete, return it without modification
  if (hasDoctype && hasHtml && hasHead && hasBody && htmlContent.length > 200) {
    console.log(`HTML for ${filePath} is already complete (${htmlContent.length} chars), returning as-is`)
    return htmlContent
  }

  console.log(`HTML for ${filePath} needs completion - hasDoctype: ${hasDoctype}, hasHtml: ${hasHtml}, hasHead: ${hasHead}, hasBody: ${hasBody}, length: ${htmlContent.length}`)

  // Ensure DOCTYPE declaration
  if (!htmlContent.toLowerCase().startsWith('<!doctype')) {
    htmlContent = '<!DOCTYPE html>\n' + htmlContent
  }

  // Ensure html tag
  if (!htmlContent.toLowerCase().includes('<html')) {
    htmlContent = htmlContent.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<html lang="en">') + '\n</html>'
  }

  // Ensure head section
  if (!htmlContent.toLowerCase().includes('<head')) {
    const htmlMatch = htmlContent.match(/<html[^>]*>/i)
    if (htmlMatch) {
      htmlContent = htmlContent.replace(
        htmlMatch[0],
        `${htmlMatch[0]}\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Generated Website</title>\n</head>`
      )
    }
  }

  // Ensure body section
  if (!htmlContent.toLowerCase().includes('<body')) {
    const headEndMatch = htmlContent.match(/<\/head>/i)
    if (headEndMatch) {
      htmlContent = htmlContent.replace(
        headEndMatch[0],
        `${headEndMatch[0]}\n<body>\n    <h1>Welcome to Your Website</h1>\n    <p>This is a generated website.</p>\n</body>`
      )
    }
  }

  // Ensure closing tags
  if (htmlContent.includes('<html') && !htmlContent.includes('</html>')) {
    htmlContent += '\n</html>'
  }
  if (htmlContent.includes('<head') && !htmlContent.includes('</head>')) {
    htmlContent = htmlContent.replace(/(<head[^>]*>)/i, '$1\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Generated Website</title>\n</head>')
  }
  if (htmlContent.includes('<body') && !htmlContent.includes('</body>')) {
    htmlContent = htmlContent.replace(/(<body[^>]*>)/i, '$1\n    <h1>Welcome to Your Website</h1>\n    <p>This is a generated website.</p>\n</body>')
  }

  return htmlContent
}

/**
 * Creates a basic HTML structure when content is missing or incomplete
 */
export function createBasicHTMLStructure(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            line-height: 1.6;
            text-align: center;
        }
        .status {
            background: #e3f2fd;
            border: 1px solid #2196f3;
            color: #1976d2;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Generated Website</h1>
        <div class="status">
            <strong>Website Generated Successfully!</strong><br>
            This website was created using AI-powered code generation.
        </div>
        <p>
            Your website is ready! The content is being processed and will be available shortly.
            This is a placeholder page that will be replaced with your actual content.
        </p>
    </div>
</body>
</html>`
}

/**
 * Validates and fixes HTML file content
 */
export function validateAndFixHTMLFile(file: HTMLFile): HTMLFile {
  if (file.type === 'HTML' || file.path.endsWith('.html') || file.path.endsWith('.htm')) {
    const fixedContent = ensureCompleteHTML(file.content, file.path)
    return {
      ...file,
      content: fixedContent,
      size: fixedContent.length
    }
  }
  return file
}

/**
 * Processes an array of files and ensures HTML files are complete
 */
export function processFilesForHTMLCompleteness(files: HTMLFile[]): HTMLFile[] {
  return files.map(file => validateAndFixHTMLFile(file))
}

/**
 * Checks if HTML content appears to be complete
 */
export function isHTMLContentComplete(content: string): boolean {
  if (!content || content.length < 100) return false
  
  const hasDoctype = content.toLowerCase().includes('<!doctype')
  const hasHtml = content.toLowerCase().includes('<html')
  const hasHead = content.toLowerCase().includes('<head')
  const hasBody = content.toLowerCase().includes('<body')
  const hasClosingHtml = content.toLowerCase().includes('</html>')
  
  return hasDoctype && hasHtml && hasHead && hasBody && hasClosingHtml
}

/**
 * Logs HTML content analysis for debugging
 */
export function logHTMLContentAnalysis(file: HTMLFile): void {
  console.log(`HTML Analysis for ${file.path}:`)
  console.log(`  - Content length: ${file.content.length}`)
  console.log(`  - Has DOCTYPE: ${file.content.toLowerCase().includes('<!doctype')}`)
  console.log(`  - Has HTML tag: ${file.content.toLowerCase().includes('<html')}`)
  console.log(`  - Has HEAD: ${file.content.toLowerCase().includes('<head')}`)
  console.log(`  - Has BODY: ${file.content.toLowerCase().includes('<body')}`)
  console.log(`  - Has closing HTML: ${file.content.toLowerCase().includes('</html>')}`)
  console.log(`  - Is complete: ${isHTMLContentComplete(file.content)}`)
  console.log(`  - Content preview: ${file.content.substring(0, 200)}...`)
}
