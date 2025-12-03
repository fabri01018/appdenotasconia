// Simple logging utility
export const logger = {
  info: (message, ...args) => console.log(message, ...args),
  error: (message, ...args) => console.error(message, ...args),
  warn: (message, ...args) => console.warn(message, ...args)
};
