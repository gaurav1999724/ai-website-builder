import { fixImageUrls } from './image-url-fixer'

interface ProjectFile {
  id: string
  path: string
  content: string
  type: string
  size: number
}

interface Project {
  id: string
  title: string
  description: string
  status: string
  files: ProjectFile[]
}

export const getCombinedHTMLContent = (project: Project, targetFile?: string) => {
  if (!project) return ''
  
  // Priority order: index.html > home.html > index.js > first HTML file > first file
  const indexHtmlFile = project.files?.find(f => 
    f.path.toLowerCase().endsWith('index.html')
  )
  const homeHtmlFile = project.files?.find(f => 
    f.path.toLowerCase().endsWith('home.html')
  )
  const indexJsFile = project.files?.find(f => 
    f.path.toLowerCase().endsWith('index.js')
  )
  const firstHtmlFile = project.files?.find(f => 
    f.path.toLowerCase().endsWith('.html')
  )
  
  // If targetFile is specified, try to find that specific HTML file
  let htmlFile = null
  if (targetFile) {
    console.log('🔍 Looking for target file:', targetFile)
    console.log('📁 Available HTML files:', project.files?.filter(f => f.type === 'HTML').map(f => f.path))
    
    // First try exact path match
    htmlFile = project.files?.find(f => f.type === 'HTML' && f.path === targetFile)
    if (htmlFile) {
      console.log('✅ Found exact match:', htmlFile.path)
    }
    
    // If not found, try to find by filename (case-insensitive)
    if (!htmlFile) {
      const targetFileName = targetFile.toLowerCase()
      htmlFile = project.files?.find(f => 
        f.type === 'HTML' && 
        f.path.toLowerCase().endsWith(targetFileName)
      )
      if (htmlFile) {
        console.log('✅ Found filename match:', htmlFile.path)
      }
    }
    
    // If still not found, try to find by filename without extension
    if (!htmlFile) {
      const targetNameWithoutExt = targetFile.replace(/\.html$/i, '').toLowerCase()
      htmlFile = project.files?.find(f => 
        f.type === 'HTML' && 
        f.path.toLowerCase().includes(targetNameWithoutExt)
      )
      if (htmlFile) {
        console.log('✅ Found partial match:', htmlFile.path)
      }
    }
    
    if (!htmlFile) {
      console.log('❌ No match found for target file:', targetFile)
    }
  }
  
  // If target file not found, fall back to priority-based selection
  if (!htmlFile) {
    htmlFile = indexHtmlFile || homeHtmlFile || indexJsFile || firstHtmlFile || project.files?.[0]
  }
  
  if (!htmlFile) {
    console.error('❌ No HTML file found for target:', targetFile)
    console.log('📁 Available files:', project.files?.map(f => ({ path: f.path, type: f.type })))
    
    // Create a fallback HTML page
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - ${project.title || 'Generated Website'}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 40px; 
            background: #f5f5f5; 
            text-align: center; 
        }
        .error-container { 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            max-width: 500px; 
            margin: 0 auto; 
        }
        h1 { color: #e74c3c; margin-bottom: 20px; }
        p { color: #666; margin-bottom: 20px; }
        .file-list { 
            text-align: left; 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 4px; 
            margin-top: 20px; 
        }
        .file-list h3 { margin-top: 0; color: #333; }
        .file-list ul { margin: 0; padding-left: 20px; }
        .file-list li { margin: 5px 0; color: #666; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404 - Page Not Found</h1>
        <p>The requested page "${targetFile}" could not be found.</p>
        <p>This might be because:</p>
        <ul style="text-align: left; display: inline-block;">
            <li>The file doesn't exist in this project</li>
            <li>The file path is incorrect</li>
            <li>The file is not an HTML file</li>
        </ul>
        
        <div class="file-list">
            <h3>Available HTML Files:</h3>
            <ul>
                ${project.files?.filter(f => f.type === 'HTML').map(f => `<li>${f.path}</li>`).join('') || '<li>No HTML files found</li>'}
            </ul>
        </div>
    </div>
</body>
</html>`
    
    return fallbackHtml
  }
  
  let htmlContent = htmlFile.content
  
  // Fix broken image URLs in the HTML content
  htmlContent = fixImageUrls(htmlContent)
  
  // Get all CSS files
  const cssFiles = project.files?.filter(f => f.type === 'CSS') || []
  const cssContent = cssFiles.map(f => f.content).join('\n')
  
  // Get all JavaScript files
  const jsFiles = project.files?.filter(f => f.type === 'JAVASCRIPT') || []
  const jsContent = jsFiles.map(f => f.content).join('\n')
  
  // Advanced project detection and logging
  const htmlFiles = project.files?.filter(f => f.type === 'HTML') || []
  const isAdvancedProject = htmlFiles.length >= 5 && cssFiles.length >= 2 && jsFiles.length >= 2
  
  if (isAdvancedProject) {
    console.log(`🚀 Advanced project detected: ${htmlFiles.length} HTML files, ${cssFiles.length} CSS files, ${jsFiles.length} JS files`)
    console.log(`📁 HTML files: ${htmlFiles.map(f => f.path).join(', ')}`)
    console.log(`🎨 CSS files: ${cssFiles.map(f => f.path).join(', ')}`)
    console.log(`⚡ JS files: ${jsFiles.map(f => f.path).join(', ')}`)
    console.log(`📊 Total files: ${project.files?.length || 0}`)
  }
  
  // Inject CSS into the HTML
  if (cssContent) {
    // Keep external CSS links (fonts, CDNs) but remove local CSS links
    htmlContent = htmlContent.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*\.css["'][^>]*>/gi, '')
    
    // Add Bootstrap CSS and Icons if the HTML references Bootstrap
    let bootstrapCSS = ''
    if (htmlContent.includes('bootstrap') || htmlContent.includes('data-bs-') || htmlContent.includes('data-toggle')) {
      bootstrapCSS = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">'
    }
    
    // Add all popular CDN libraries if the HTML uses them
    let cdnLibraries = ''
    
    // Icon Libraries
    if (htmlContent.includes('bi bi-') || htmlContent.includes('bootstrap-icons')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css">\n'
    }
    if (htmlContent.includes('fa fa-') || htmlContent.includes('fas fa-') || htmlContent.includes('far fa-') || htmlContent.includes('fab fa-') || htmlContent.includes('font-awesome')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">\n'
    }
    if (htmlContent.includes('material-icons') || htmlContent.includes('material-symbols')) {
      cdnLibraries += '<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">\n'
    }
    if (htmlContent.includes('feather-') || htmlContent.includes('feather-icons')) {
      cdnLibraries += '<script src="https://unpkg.com/feather-icons"></script>\n'
    }
    if (htmlContent.includes('heroicon') || htmlContent.includes('heroicons')) {
      cdnLibraries += '<script src="https://unpkg.com/@heroicons/react@2.0.18/24/outline/index.js"></script>\n'
    }
    if (htmlContent.includes('lucide') || htmlContent.includes('lucide-react')) {
      cdnLibraries += '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>\n'
    }
    
    // CSS Frameworks
    if (htmlContent.includes('tailwind') || htmlContent.includes('tw-') || htmlContent.includes('bg-blue-')) {
      cdnLibraries += '<script src="https://cdn.tailwindcss.com"></script>\n'
    }
    if (htmlContent.includes('bulma') || htmlContent.includes('is-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">\n'
    }
    if (htmlContent.includes('foundation') || htmlContent.includes('foundation-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/foundation-sites@6.7.5/dist/css/foundation.min.css">\n'
    }
    if (htmlContent.includes('semantic-ui') || htmlContent.includes('ui ')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css">\n'
    }
    if (htmlContent.includes('materialize') || htmlContent.includes('materialize-css')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">\n'
    }
    
    // Animation Libraries
    if (htmlContent.includes('animate') || htmlContent.includes('animated') || htmlContent.includes('fadeIn')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">\n'
    }
    if (htmlContent.includes('aos') || htmlContent.includes('data-aos')) {
      cdnLibraries += '<link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">\n'
    }
    if (htmlContent.includes('gsap') || htmlContent.includes('TweenMax') || htmlContent.includes('TimelineMax')) {
      cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\n'
    }
    if (htmlContent.includes('lottie') || htmlContent.includes('lottie-player')) {
      cdnLibraries += '<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>\n'
    }
    
    // Chart Libraries
    if (htmlContent.includes('chart.js') || htmlContent.includes('Chart')) {
      cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n'
    }
    if (htmlContent.includes('d3') || htmlContent.includes('d3-')) {
      cdnLibraries += '<script src="https://d3js.org/d3.v7.min.js"></script>\n'
    }
    if (htmlContent.includes('plotly') || htmlContent.includes('Plotly')) {
      cdnLibraries += '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>\n'
    }
    if (htmlContent.includes('highcharts') || htmlContent.includes('Highcharts')) {
      cdnLibraries += '<script src="https://code.highcharts.com/highcharts.js"></script>\n'
    }
    
    // UI Component Libraries
    if (htmlContent.includes('swiper') || htmlContent.includes('swiper-container')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css">\n'
    }
    if (htmlContent.includes('slick') || htmlContent.includes('slick-carousel')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css">\n'
    }
    if (htmlContent.includes('owl-carousel') || htmlContent.includes('owl-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css">\n'
    }
    if (htmlContent.includes('lightbox') || htmlContent.includes('data-lightbox')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/css/lightbox.min.css">\n'
    }
    if (htmlContent.includes('fancybox') || htmlContent.includes('data-fancybox')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css">\n'
    }
    
    // Form Libraries
    if (htmlContent.includes('select2') || htmlContent.includes('select2-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">\n'
    }
    if (htmlContent.includes('flatpickr') || htmlContent.includes('flatpickr-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">\n'
    }
    if (htmlContent.includes('quill') || htmlContent.includes('ql-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.quilljs.com/1.3.6/quill.snow.css">\n'
    }
    
    // Utility Libraries
    if (htmlContent.includes('lodash') || htmlContent.includes('_.')) {
      cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>\n'
    }
    if (htmlContent.includes('moment') || htmlContent.includes('moment.js')) {
      cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>\n'
    }
    if (htmlContent.includes('dayjs') || htmlContent.includes('day.js')) {
      cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>\n'
    }
    
    // Google Fonts
    if (htmlContent.includes('google-fonts') || htmlContent.includes('fonts.googleapis.com')) {
      cdnLibraries += '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    }
    
    htmlContent = htmlContent.replace('</head>', `${bootstrapCSS}\n${cdnLibraries}<style>\n${cssContent}\n</style>\n</head>`)
  } else {
    // Add Bootstrap CSS and Icons if needed even without custom CSS
    let bootstrapCSS = ''
    if (htmlContent.includes('bootstrap') || htmlContent.includes('data-bs-') || htmlContent.includes('data-toggle')) {
      bootstrapCSS = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">'
    }
    
    // Add all popular CDN libraries if the HTML uses them (same as above)
    let cdnLibraries = ''
    
    // Icon Libraries
    if (htmlContent.includes('bi bi-') || htmlContent.includes('bootstrap-icons')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css">\n'
    }
    if (htmlContent.includes('fa fa-') || htmlContent.includes('fas fa-') || htmlContent.includes('far fa-') || htmlContent.includes('fab fa-') || htmlContent.includes('font-awesome')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">\n'
    }
    if (htmlContent.includes('material-icons') || htmlContent.includes('material-symbols')) {
      cdnLibraries += '<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">\n'
    }
    if (htmlContent.includes('feather-') || htmlContent.includes('feather-icons')) {
      cdnLibraries += '<script src="https://unpkg.com/feather-icons"></script>\n'
    }
    if (htmlContent.includes('heroicon') || htmlContent.includes('heroicons')) {
      cdnLibraries += '<script src="https://unpkg.com/@heroicons/react@2.0.18/24/outline/index.js"></script>\n'
    }
    if (htmlContent.includes('lucide') || htmlContent.includes('lucide-react')) {
      cdnLibraries += '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>\n'
    }
    
    // CSS Frameworks
    if (htmlContent.includes('tailwind') || htmlContent.includes('tw-') || htmlContent.includes('bg-blue-')) {
      cdnLibraries += '<script src="https://cdn.tailwindcss.com"></script>\n'
    }
    if (htmlContent.includes('bulma') || htmlContent.includes('is-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">\n'
    }
    if (htmlContent.includes('foundation') || htmlContent.includes('foundation-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/foundation-sites@6.7.5/dist/css/foundation.min.css">\n'
    }
    if (htmlContent.includes('semantic-ui') || htmlContent.includes('ui ')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css">\n'
    }
    if (htmlContent.includes('materialize') || htmlContent.includes('materialize-css')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">\n'
    }
    
    // Animation Libraries
    if (htmlContent.includes('animate') || htmlContent.includes('animated') || htmlContent.includes('fadeIn')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">\n'
    }
    if (htmlContent.includes('aos') || htmlContent.includes('data-aos')) {
      cdnLibraries += '<link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">\n'
    }
    if (htmlContent.includes('gsap') || htmlContent.includes('TweenMax') || htmlContent.includes('TimelineMax')) {
      cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\n'
    }
    if (htmlContent.includes('lottie') || htmlContent.includes('lottie-player')) {
      cdnLibraries += '<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>\n'
    }
    
    // Chart Libraries
    if (htmlContent.includes('chart.js') || htmlContent.includes('Chart')) {
      cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\n'
    }
    if (htmlContent.includes('d3') || htmlContent.includes('d3-')) {
      cdnLibraries += '<script src="https://d3js.org/d3.v7.min.js"></script>\n'
    }
    if (htmlContent.includes('plotly') || htmlContent.includes('Plotly')) {
      cdnLibraries += '<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>\n'
    }
    if (htmlContent.includes('highcharts') || htmlContent.includes('Highcharts')) {
      cdnLibraries += '<script src="https://code.highcharts.com/highcharts.js"></script>\n'
    }
    
    // UI Component Libraries
    if (htmlContent.includes('swiper') || htmlContent.includes('swiper-container')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css">\n'
    }
    if (htmlContent.includes('slick') || htmlContent.includes('slick-carousel')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css">\n'
    }
    if (htmlContent.includes('owl-carousel') || htmlContent.includes('owl-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css">\n'
    }
    if (htmlContent.includes('lightbox') || htmlContent.includes('data-lightbox')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/lightbox2/2.11.4/css/lightbox.min.css">\n'
    }
    if (htmlContent.includes('fancybox') || htmlContent.includes('data-fancybox')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css">\n'
    }
    
    // Form Libraries
    if (htmlContent.includes('select2') || htmlContent.includes('select2-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">\n'
    }
    if (htmlContent.includes('flatpickr') || htmlContent.includes('flatpickr-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">\n'
    }
    if (htmlContent.includes('quill') || htmlContent.includes('ql-')) {
      cdnLibraries += '<link rel="stylesheet" href="https://cdn.quilljs.com/1.3.6/quill.snow.css">\n'
    }
    
    // Utility Libraries
    if (htmlContent.includes('lodash') || htmlContent.includes('_.')) {
      cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>\n'
    }
    if (htmlContent.includes('moment') || htmlContent.includes('moment.js')) {
      cdnLibraries += '<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>\n'
    }
    if (htmlContent.includes('dayjs') || htmlContent.includes('day.js')) {
      cdnLibraries += '<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>\n'
    }
    
    // Google Fonts
    if (htmlContent.includes('google-fonts') || htmlContent.includes('fonts.googleapis.com')) {
      cdnLibraries += '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    }
    
    if (bootstrapCSS || cdnLibraries) {
      htmlContent = htmlContent.replace('</head>', `${bootstrapCSS}\n${cdnLibraries}</head>`)
    }
  }
  
  // Inject JavaScript into the HTML
  if (jsContent) {
    const jsEmbed = `<script>\n${jsContent}\n</script>`
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${jsEmbed}\n</body>`)
    } else if (htmlContent.includes('<body>')) {
      htmlContent = htmlContent.replace('<body>', `<body>\n${jsEmbed}`)
    } else {
      htmlContent = htmlContent.replace('</html>', `\n${jsEmbed}\n</html>`)
    }
  }
  
  // Initialize AOS if present
  if (htmlContent.includes('aos') || htmlContent.includes('data-aos')) {
    const aosInit = `<script>AOS.init();</script>`
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${aosInit}\n</body>`)
    } else {
      htmlContent = htmlContent.replace('</html>', `\n${aosInit}\n</html>`)
    }
  }
  
  return htmlContent
}
