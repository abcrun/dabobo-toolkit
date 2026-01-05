import { dangerousAttributes } from './utils.js';

const isInSandbox = (element) => element.dataset.createdInSandbox === 'true';

const isElementNode = (node) => node && node.nodeType === Node.ELEMENT_NODE;
const getTagName = (node) =>
  isElementNode(node) ? node.tagName.toUpperCase() : '';

// 需要预拦截Element的原始属性和方法
const originals = {
  appendChild: Element.prototype.appendChild,
  append: Element.prototype.append,
  insertBefore: Element.prototype.insertBefore,
  setAttribute: Element.prototype.setAttribute,
  innerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'),
  outerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML'),
};

// 安全处理属性值
const sanitizeAttribute = (name, value, element, sandbox) => {
  const tagName = getTagName(element);
  const lowerName = name.toLowerCase();
  const lowerValue = value.toLowerCase();

  // 1. 阻止所有内联事件处理器
  if (dangerousAttributes.eventHandlers.test(name)) {
    console.warn(`沙箱内禁止设置事件属性: ${name}`);
    return null; // 返回 null 表示阻止设置
  }

  // 2. 阻止 javascript: 伪协议
  if (dangerousAttributes.scriptProtocol.test(lowerValue)) {
    console.warn(`沙箱内禁止使用javascript:伪协议: ${name}="${value}"`);
    return null;
  }

  // 3. 对于链接类属性，进行域名白名单检查
  if (['href', 'src', 'action', 'formaction'].includes(lowerName) && value) {
    // 如果是 URL，检查域名
    const url = new URL(value, window.location.href);
    if (!sandbox.isAllowedDomain(url.hostname)) {
      console.warn(`沙箱内禁止加载外部资源: ${url.hostname}`);
      return null;
    }
  }

  // 4. 检查style属性中的危险内容
  if (lowerName === 'style') {
    if (dangerousAttributes.expression.test(value)) {
      console.warn(`沙箱内禁止使用CSS表达式: ${value}`);
      return null;
    }
    sandbox.scopedStyles([element]);
  }

  // 5. 特殊标签的特殊属性检查
  if (
    tagName === 'SCRIPT' &&
    ['src', 'text', 'innerHTML', 'textContent'].includes(lowerName)
  ) {
    sandbox.loadScript([element]);
    return null;
  }

  // 6. 沙箱内禁止创建Link标签加载外部样式资源
  if (tagName === 'LINK') {
    console.warn(`沙箱内禁止创建或修改IFRAME元素`);
    return null;
  }

  // 7. 沙箱内禁止设置iframe
  if (tagName === 'IFRAME') {
    console.warn(`沙箱内禁止创建或修改IFRAME元素`);
    return null;
  }

  return value;
};

const enhancedElement = (sandbox) => {
  // 处理appendChild
  Element.prototype.appendChild = function (child) {
    if (isInSandbox(this)) {
      const tagName = getTagName(child);

      switch (tagName) {
        case 'SCRIPT':
          sandbox.loadScript([child]);
          return child;

        case 'STYLE':
          sandbox.scopedStyles([child]);
          return originals.appendChild.call(this, child);

        case 'LINK':
          throw new Error('禁止在沙箱内加载外部样式资源');

        case 'IFRAME':
          throw new Error('禁止在沙箱内创建 iframe 元素');

        default:
          return originals.appendChild.call(this, child);
      }
    }

    return originals.appendChild.call(this, child);
  };

  // 处理append（可接受多个节点）
  Element.prototype.append = function (...nodes) {
    if (isInSandbox(this)) {
      const filteredNodes = [];

      nodes.forEach((node) => {
        const tagName = getTagName(node);

        if (tagName === 'SCRIPT') {
          sandbox.loadScript([node]);
        } else if (tagName === 'STYLE') {
          sandbox.scopedStyles([node]);
          filteredNodes.push(node);
        } else if (tagName === 'LINK') {
          throw new Error('禁止在沙箱内加载外部样式资源');
        } else if (tagName === 'IFRAME') {
          throw new Error('禁止在沙箱内创建 iframe 元素');
        } else {
          filteredNodes.push(node);
        }
      });

      return originals.append.call(this, ...filteredNodes);
    }

    return originals.append.call(this, ...nodes);
  };

  // 处理insertBefore
  Element.prototype.insertBefore = function (newNode, referenceNode) {
    if (isInSandbox(this)) {
      const tagName = getTagName(newNode);

      if (tagName === 'SCRIPT') {
        sandbox.loadScript([newNode]);
        return newNode;
      }
      if (tagName === 'STYLE') {
        sandbox.scopedStyles([newNode]);
        return originals.insertBefore.call(this, newNode, referenceNode);
      }
      if (tagName === 'LINK') {
        throw new Error('禁止在沙箱内加载外部样式资源');
      }
      if (tagName === 'IFRAME') {
        throw new Error('禁止在沙箱内创建 iframe 元素');
      }
    }

    return originals.insertBefore.call(this, newNode, referenceNode);
  };

  Element.prototype.setAttribute = function (name, value) {
    // 参数验证
    if (typeof name !== 'string' || value === undefined || value === null) {
      return originals.setAttribute.call(this, name, value);
    }

    // 检查是否在沙箱内
    if (isInSandbox(this)) {
      const sanitizedValue = sanitizeAttribute(name, String(value), this);

      if (sanitizedValue === null) {
        // 被拦截，不设置属性
        return this;
      }

      // 使用处理后的值
      return originals.setAttribute.call(this, name, sanitizedValue);
    }

    // 沙箱外使用原始方法
    return originals.setAttribute.call(this, name, value);
  };

  // 处理outerHTML
  Object.defineProperty(Element.prototype, 'outerHTML', {
    set(value) {
      if (isInSandbox(this)) {
        const cleanHTML = sandbox.processHTML(value);
        originals.outerHTML.set.call(this, cleanHTML);
      } else {
        originals.outerHTML.set.call(this, value);
      }
    },
    get: originals.outerHTML.get,
  });

  // 处理innerHTML
  Object.defineProperty(Element.prototype, 'innerHTML', {
    set(value) {
      if (isInSandbox(this)) {
        const cleanHTML = sandbox.processHTML(value);
        originals.innerHTML.set.call(this, cleanHTML);
      } else {
        originals.innerHTML.set.call(this, value);
      }
    },
    get: originals.innerHTML.get,
  });

  // 提供恢复方法
  return () => {
    Element.prototype.appendChild = originals.appendChild;
    Element.prototype.append = originals.append;
    Element.prototype.insertBefore = originals.insertBefore;
    Object.defineProperty(Element.prototype, 'innerHTML', originals.innerHTML);
    Object.defineProperty(Element.prototype, 'outerHTML', originals.outerHTML);
  };
};

export default enhancedElement;
