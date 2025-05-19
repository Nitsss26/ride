
// Simple logging utility for consistent error logging across services

/**
 * Log an error with consistent formatting
 * @param {string} serviceName - The name of the service logging the error
 * @param {Error|string} error - The error object or message
 * @param {string} context - Additional context about where the error occurred
 */
function logError(serviceName, error, context = "") {
  const timestamp = new Date().toISOString()
  const errorMessage = error instanceof Error ? error.message : error
  const stack = error instanceof Error ? error.stack : null

  console.error(`[${timestamp}] [${serviceName}] [ERROR] ${context ? `[${context}] ` : ""}${errorMessage}`)

  if (stack) {
    console.error(`Stack trace: ${stack}`)
  }

  // In a production system, you might want to log to a file or external service
  // logToFile(serviceName, errorMessage, context, stack);
}

/**
 * Log an informational message with consistent formatting
 * @param {string} serviceName - The name of the service logging the message
 * @param {string} message - The message to log
 * @param {string} context - Additional context about where the message originated
 */
function logInfo(serviceName, message, context = "") {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${serviceName}] [INFO] ${context ? `[${context}] ` : ""}${message}`)

  // In a production system, you might want to log to a file or external service
  // logToFile(serviceName, message, context);
}

module.exports = {
  logError,
  logInfo,
}
