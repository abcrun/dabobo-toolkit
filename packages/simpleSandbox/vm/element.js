const enhancedElement = (sandbox) => {
  const originals = {
    appendChild: Element.prototype.appendChild,
    append: Element.prototype.append,
    insertBefore: Element.prototype.insertBefore,
    setAttribute: Element.prototype.setAttribute,
    innerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML'),
    outerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML'),
  };

  // 定义危险属性模式
  const dangerousAttributes = {
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

  const isInSandbox = (element) => element.closest && element.closest('xxx');
  const isElementNode = (node) => node && node.nodeType === Node.ELEMENT_NODE;
  const getTagName = (node) =>
    isElementNode(node) ? node.tagName.toUpperCase() : '';

  // 安全处理属性值
  const sanitizeAttribute = (name, value, element) => {
    const tagName = getTagName(element);
    const lowerName = name.toLowerCase();
    const lowerValue = value.toLowerCase();

    // 1. 阻止所有内联事件处理器
    if (dangerousAttributes.eventHandlers.test(name)) {
      console.warn(
        `沙箱内禁止设置事件属性: ${name}="${value.substring(0, 50)}..."`,
      );
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
      try {
        const url = new URL(value, window.location.href);
        if (!sandbox.isAllowedDomain(url.hostname)) {
          console.warn(`沙箱内禁止加载外部资源: ${url.hostname}`);
          return null;
        }
      } catch (e) {
        // 如果不是合法URL，允许相对路径
        if (
          !value.startsWith('/') &&
          !value.startsWith('./') &&
          !value.startsWith('../')
        ) {
          console.warn(`沙箱内可疑的路径值: ${name}="${value}"`);
        }
      }
    }

    // 4. 检查style属性中的危险内容
    if (lowerName === 'style') {
      if (dangerousAttributes.expression.test(value)) {
        console.warn(`沙箱内禁止使用CSS表达式: ${value.substring(0, 50)}...`);
        return null;
      }
    }

    // 5. 特殊标签的特殊属性检查
    if (
      tagName === 'SCRIPT' &&
      ['src', 'text', 'innerHTML'].includes(lowerName)
    ) {
      console.warn(`沙箱内禁止直接操作SCRIPT标签的${name}属性`);
      return null;
    }

    if (tagName === 'IFRAME') {
      console.warn(`沙箱内禁止创建或修改IFRAME元素`);
      return null;
    }

    // 6. 交给沙箱的processAttribute做进一步处理
    if (sandbox.processAttribute) {
      return sandbox.processAttribute(name, value, element);
    }

    return value;
  };

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
          if (child.rel === 'stylesheet' && child.href) {
            if (sandbox.isAllowedDomain(child.href)) {
              return originals.appendChild.call(this, child);
            }
            throw new Error('禁止在沙箱内加载不安全的外部样式资源');
          }
          return originals.appendChild.call(this, child);

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
          if (node.rel === 'stylesheet' && node.href) {
            if (sandbox.isAllowedDomain(node.href)) {
              filteredNodes.push(node);
            } else {
              throw new Error('禁止在沙箱内加载不安全的外部样式资源');
            }
          } else {
            filteredNodes.push(node);
          }
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
        if (newNode.rel === 'stylesheet' && newNode.href) {
          if (sandbox.isAllowedDomain(newNode.href)) {
            return originals.insertBefore.call(this, newNode, referenceNode);
          }
          throw new Error('禁止在沙箱内加载不安全的外部样式资源');
        }
        return originals.insertBefore.call(this, newNode, referenceNode);
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
        return;
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
