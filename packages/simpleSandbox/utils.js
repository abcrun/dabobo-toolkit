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

// 定义危险属性模式
export const dangerousAttributes = {
  // 事件处理器
  eventHandlers: /^on[a-z]+/i,
  // 脚本执行
  scriptProtocol: /^javascript:/i,
  // 危险样式表达式
  expression: /expression\s*\(/i,
  // 数据协议（可配置）
  dataProtocol: /^data:/i,
  // 其他危险属性
  dangerousProps: [
    'src',
    'href',
    'action',
    'formaction',
    'poster',
    'srcset',
    'background',
    'lowsrc',
  ],
};

export const isStyleContentSafe = (content) => {
  const dangerousPatterns = [
    /@import/i,
    /expression\s*\(/i,
    /url\(\s*['"]?\s*javascript:/i,
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
    /(?:window\.)?(?:alert|eval\s*)\(/i,
    /<script|<iframe|<object|<embed/i,
    // /<[^<>]+on[a-z]+=/i, // 脚本中如果通过innerHTML添加元素绑定了on*事件
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
