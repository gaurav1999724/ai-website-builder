# Logging System

The AI Website Builder includes a comprehensive logging system that captures errors, exceptions, and important events in structured log files.

## Features

- **Structured Logging**: All logs are stored in JSON format for easy parsing
- **Multiple Log Levels**: ERROR, WARN, INFO, DEBUG
- **Automatic Log Rotation**: Logs are rotated when they exceed 10MB
- **Request Tracking**: Each API request gets a unique request ID
- **Contextual Information**: Logs include user ID, session ID, and request metadata
- **Error Stack Traces**: Full error information including stack traces
- **Performance Metrics**: Duration tracking for API calls and AI generation

## Log Files

Logs are stored in the `/logs` directory with the following naming convention:
- `error-YYYY-MM-DD.log` - Error level logs
- `warn-YYYY-MM-DD.log` - Warning level logs  
- `info-YYYY-MM-DD.log` - Information level logs
- `debug-YYYY-MM-DD.log` - Debug level logs

## Log Structure

Each log entry contains:
```json
{
  "timestamp": "2025-09-23T06:00:00.000Z",
  "level": "ERROR",
  "message": "AI generation failed",
  "error": {
    "name": "Error",
    "message": "API request failed",
    "stack": "Error: API request failed\n    at ..."
  },
  "metadata": {
    "provider": "cerebras",
    "duration": 5000,
    "userId": "user123"
  },
  "userId": "user123",
  "sessionId": "session456",
  "requestId": "req_1234567890_abc123",
  "endpoint": "/api/projects/generate",
  "method": "POST",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

## What Gets Logged

### API Requests
- All incoming API requests with method, endpoint, and response status
- Request duration and performance metrics
- User authentication status
- Request/response payloads (for debugging)

### AI Generation
- AI provider selection and prompt details
- Generation success/failure with duration
- Token usage and model information
- File generation results

### Database Operations
- Database queries and their performance
- Connection issues and timeouts
- Data validation errors

### Authentication
- Login/logout events
- Authentication failures
- Session management

### Errors and Exceptions
- Unhandled exceptions with full stack traces
- API errors with context
- Database errors
- AI provider errors

## Viewing Logs

### Command Line Tools

```bash
# List all log files
npm run logs:list

# View recent entries from all log files
npm run logs:view

# View specific log file
npm run logs:view error.log 100

# Search logs
npm run logs:search "AI generation"
npm run logs:search "failed" ERROR

# View recent error entries
npm run logs:tail error.log 50
```

### Log Viewer Script

The `scripts/view-logs.js` script provides a comprehensive log viewing interface:

```bash
# Show help
node scripts/view-logs.js

# List log files
node scripts/view-logs.js list

# View logs with custom parameters
node scripts/view-logs.js view [filename] [lines]

# Search logs
node scripts/view-logs.js search <query> [level]

# View recent entries
node scripts/view-logs.js tail [filename] [lines]
```

## Log Levels

### ERROR
- Unhandled exceptions
- API failures
- Database errors
- AI generation failures
- Authentication errors

### WARN
- Invalid request data
- Rate limiting
- Deprecated API usage
- Performance warnings

### INFO
- Successful operations
- User actions
- System events
- Performance metrics

### DEBUG
- Detailed execution flow
- Request/response data
- Internal state information

## Log Rotation

- **File Size Limit**: 10MB per log file
- **File Retention**: 5 rotated files per log level
- **Automatic Rotation**: Happens when file exceeds size limit
- **Naming Convention**: `filename.1.log`, `filename.2.log`, etc.

## Configuration

The logging system can be configured in `src/lib/logger.ts`:

```typescript
class Logger {
  private maxFileSize: number = 10 * 1024 * 1024 // 10MB
  private maxFiles: number = 5
  // ...
}
```

## Environment Variables

- `NODE_ENV`: Set to 'development' to enable console logging
- `LOG_LEVEL`: Minimum log level to capture (default: INFO)

## Best Practices

1. **Use Appropriate Log Levels**: 
   - ERROR for failures that need immediate attention
   - WARN for issues that should be monitored
   - INFO for important business events
   - DEBUG for detailed troubleshooting

2. **Include Context**: Always include relevant metadata like userId, requestId, etc.

3. **Don't Log Sensitive Data**: Avoid logging passwords, API keys, or personal information

4. **Use Structured Data**: Include metadata objects for easy filtering and analysis

5. **Monitor Log Files**: Regularly check error logs for issues

## Integration

The logging system is automatically integrated into:
- All API routes (via `withApiLogging` middleware)
- AI generation functions
- Database operations
- Authentication flows
- Error boundaries

## Troubleshooting

### Common Issues

1. **Logs Directory Not Created**: The system automatically creates the logs directory
2. **Permission Errors**: Ensure the application has write permissions to the logs directory
3. **Large Log Files**: Log rotation happens automatically, but you can manually clean old logs
4. **Missing Logs**: Check that the logging system is properly imported and initialized

### Debug Mode

Enable debug logging by setting the log level to DEBUG in your environment:

```bash
LOG_LEVEL=DEBUG npm run dev
```

This will capture more detailed information for troubleshooting.
