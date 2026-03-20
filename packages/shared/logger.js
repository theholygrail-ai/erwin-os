const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? LOG_LEVELS.info;

function formatMessage(level, context, message, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
  };
  if (data !== undefined) entry.data = data;
  return JSON.stringify(entry);
}

const logger = {
  error(context, message, data) {
    if (currentLevel >= LOG_LEVELS.error)
      console.error(formatMessage('error', context, message, data));
  },
  warn(context, message, data) {
    if (currentLevel >= LOG_LEVELS.warn)
      console.warn(formatMessage('warn', context, message, data));
  },
  info(context, message, data) {
    if (currentLevel >= LOG_LEVELS.info)
      console.log(formatMessage('info', context, message, data));
  },
  debug(context, message, data) {
    if (currentLevel >= LOG_LEVELS.debug)
      console.log(formatMessage('debug', context, message, data));
  },
};

module.exports = { logger };
