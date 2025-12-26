/* eslint-disable no-bitwise */
export const uuid = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isStyleContentSafe = (content) => {
  const dangerousPatterns = [
    /@import/i,
    /expression\s*\(/i,
    /url\(\s*['"]?\s*javascript:/i,
    /<script|<iframe|<object|<embed/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
};

export const isScriptContentSafe = (content) => {
  const dangerousPatterns = [
    /window\.(?:top|parent|frames?|opener)/i,
    /(?:window\.)?document\.(?:cookie|referrer|domain)/i,
    /(?:window\.)?location\.(?:href|hash|assign)/i,
    /(?:window\.)?history\.(?:pushState|replaceState)/i,
    /(?:window\.)?localStorage|sessionStorage|indexedDB/i,
    /(?:window\.)?eval\s*\(/i,
    /<script|<iframe|<object|<embed/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
};

export const isExternalResource = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
};

export const isConstructor = (fn) =>
  fn.prototype && fn.prototype.constructor === fn;
