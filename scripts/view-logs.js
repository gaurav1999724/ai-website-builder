#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const logDir = path.join(__dirname, '..', 'logs')

function listLogFiles() {
  if (!fs.existsSync(logDir)) {
    console.log('No logs directory found.')
    return []
  }

  const files = fs.readdirSync(logDir)
    .filter(file => file.endsWith('.log'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(logDir, a))
      const statB = fs.statSync(path.join(logDir, b))
      return statB.mtime - statA.mtime
    })

  return files
}

function formatLogEntry(entry) {
  const timestamp = new Date(entry.timestamp).toLocaleString()
  const level = entry.level.padEnd(5)
  const message = entry.message
  
  let output = `[${timestamp}] ${level} ${message}`
  
  if (entry.error) {
    output += `\n  Error: ${entry.error.name}: ${entry.error.message}`
    if (entry.error.stack) {
      output += `\n  Stack: ${entry.error.stack.split('\n').slice(1, 3).join('\n  ')}`
    }
  }
  
  if (entry.metadata) {
    const metadataStr = JSON.stringify(entry.metadata, null, 2)
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n')
    output += `\n  Metadata:\n${metadataStr}`
  }
  
  return output
}

function viewLogFile(filename, lines = 50) {
  const filePath = path.join(logDir, filename)
  
  if (!fs.existsSync(filePath)) {
    console.log(`Log file ${filename} not found.`)
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const logLines = content.trim().split('\n').filter(line => line.trim())
  
  console.log(`\n=== ${filename} (last ${Math.min(lines, logLines.length)} entries) ===\n`)
  
  const entries = logLines
    .slice(-lines)
    .map(line => {
      try {
        return JSON.parse(line)
      } catch (e) {
        return { timestamp: new Date().toISOString(), level: 'UNKNOWN', message: line }
      }
    })
  
  entries.forEach(entry => {
    console.log(formatLogEntry(entry))
    console.log('')
  })
}

function viewAllLogs(lines = 20) {
  const files = listLogFiles()
  
  if (files.length === 0) {
    console.log('No log files found.')
    return
  }

  console.log('Available log files:')
  files.forEach((file, index) => {
    const filePath = path.join(logDir, file)
    const stats = fs.statSync(filePath)
    const size = (stats.size / 1024).toFixed(2)
    const modified = stats.mtime.toLocaleString()
    console.log(`  ${index + 1}. ${file} (${size}KB, modified: ${modified})`)
  })

  files.forEach(file => {
    viewLogFile(file, lines)
  })
}

function searchLogs(query, level = null) {
  const files = listLogFiles()
  const results = []

  files.forEach(file => {
    const filePath = path.join(logDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const logLines = content.trim().split('\n').filter(line => line.trim())

    logLines.forEach(line => {
      try {
        const entry = JSON.parse(line)
        const matchesQuery = entry.message.toLowerCase().includes(query.toLowerCase()) ||
                           (entry.error && entry.error.message.toLowerCase().includes(query.toLowerCase()))
        const matchesLevel = !level || entry.level === level

        if (matchesQuery && matchesLevel) {
          results.push({ file, entry })
        }
      } catch (e) {
        // Skip malformed log entries
      }
    })
  })

  if (results.length === 0) {
    console.log(`No log entries found matching "${query}"${level ? ` with level ${level}` : ''}.`)
    return
  }

  console.log(`\n=== Search Results for "${query}"${level ? ` (${level} level)` : ''} ===\n`)
  
  results.slice(-50).forEach(({ file, entry }) => {
    console.log(`[${file}] ${formatLogEntry(entry)}`)
    console.log('')
  })
}

// Command line interface
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
  case 'list':
    const files = listLogFiles()
    if (files.length === 0) {
      console.log('No log files found.')
    } else {
      console.log('Available log files:')
      files.forEach((file, index) => {
        const filePath = path.join(logDir, file)
        const stats = fs.statSync(filePath)
        const size = (stats.size / 1024).toFixed(2)
        const modified = stats.mtime.toLocaleString()
        console.log(`  ${index + 1}. ${file} (${size}KB, modified: ${modified})`)
      })
    }
    break

  case 'view':
    const filename = args[1]
    const lines = parseInt(args[2]) || 50
    if (filename) {
      viewLogFile(filename, lines)
    } else {
      viewAllLogs(lines)
    }
    break

  case 'search':
    const query = args[1]
    const level = args[2]
    if (!query) {
      console.log('Usage: node view-logs.js search <query> [level]')
      console.log('Example: node view-logs.js search "AI generation" ERROR')
    } else {
      searchLogs(query, level)
    }
    break

  case 'tail':
    const tailFile = args[1] || 'error.log'
    const tailLines = parseInt(args[2]) || 20
    viewLogFile(tailFile, tailLines)
    break

  default:
    console.log('AI Website Builder Log Viewer')
    console.log('')
    console.log('Usage:')
    console.log('  node scripts/view-logs.js list                    - List all log files')
    console.log('  node scripts/view-logs.js view [file] [lines]     - View log file (default: all files, 20 lines)')
    console.log('  node scripts/view-logs.js search <query> [level]  - Search logs')
    console.log('  node scripts/view-logs.js tail [file] [lines]     - View recent entries (default: error.log, 20 lines)')
    console.log('')
    console.log('Examples:')
    console.log('  node scripts/view-logs.js view error.log 100')
    console.log('  node scripts/view-logs.js search "AI generation"')
    console.log('  node scripts/view-logs.js search "failed" ERROR')
    console.log('  node scripts/view-logs.js tail')
    break
}
