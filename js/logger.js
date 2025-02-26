/**
 * 日志工具模块
 */

// 日志级别
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO', 
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// 当前日志级别
let currentLogLevel = LogLevel.INFO;

/**
 * 设置日志级别
 * @param {string} level - 日志级别
 */
export function setLogLevel(level) {
  if (Object.values(LogLevel).includes(level)) {
    currentLogLevel = level;
    console.log(`日志级别已设置为: ${level}`);
  }
}

/**
 * 获取格式化的时间戳
 * @returns {string} 格式化的时间戳
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * 格式化日志消息
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} [data] - 额外数据
 * @returns {string} 格式化的日志消息
 */
function formatLog(level, message, data) {
  const timestamp = getTimestamp();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  if (data) {
    logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
  }
  return logMessage;
}

/**
 * 记录调试日志
 * @param {string} message - 日志消息
 * @param {Object} [data] - 额外数据
 */
export function debug(message, data) {
  if (currentLogLevel === LogLevel.DEBUG) {
    console.debug(formatLog(LogLevel.DEBUG, message, data));
  }
}

/**
 * 记录信息日志
 * @param {string} message - 日志消息
 * @param {Object} [data] - 额外数据
 */
export function info(message, data) {
  if ([LogLevel.DEBUG, LogLevel.INFO].includes(currentLogLevel)) {
    console.info(formatLog(LogLevel.INFO, message, data));
  }
}

/**
 * 记录警告日志
 * @param {string} message - 日志消息
 * @param {Object} [data] - 额外数据
 */
export function warn(message, data) {
  if ([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN].includes(currentLogLevel)) {
    console.warn(formatLog(LogLevel.WARN, message, data));
  }
}

/**
 * 记录错误日志
 * @param {string} message - 日志消息
 * @param {Error} error - 错误对象
 * @param {Object} [data] - 额外数据
 */
export function error(message, error, data) {
  console.error(formatLog(LogLevel.ERROR, message, {
    error: {
      message: error.message,
      stack: error.stack
    },
    ...data
  }));
} 