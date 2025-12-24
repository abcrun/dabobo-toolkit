/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable no-bitwise */
import DOMPurify from 'dompurify';
import VM from './vm';

const uuid = () => {
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

const defaultOptions = {
  allowScripts: false,
  allowIframes: false,
  allowStyles: true,
  allowedDomains: [],
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  FORBID_ATTR: [],
  RETURN_DOM_FRAGMENT: true,
};

class SecureSandbox {
  constructor(options = {}) {
    this.options = { ...defaultOptions, ...options };
    this.container = null;
    this.vm = null;
  }

  // 创建 iframe 沙箱
  createIframeSandbox() {
    const iframe = document.createElement('iframe');
    iframe.setAttribute(
      'srcdoc',
      '<!DOCTYPE html><html><head></head><body></body></html>',
    );
    iframe.style.cssText = 'display:none;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    this.vm = new VM(iframe);
  }

  static isStyleContentSafe(content) {
    // 严格的危险模式检测
    const dangerousPatterns = [
      /@import/i,
      /expression\s*\(/i,
      /url\(\s*['"]?\s*javascript:/i,
      /<script|<iframe|<object|<embed/i,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  }

  static isScriptContentSafe(content) {
    // 更严格的危险模式检测
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
  }

  static isExternalResource(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  isAllowedDomain(url) {
    if (this.options.allowedDomains.length === 0) return true;

    try {
      const parsed = new URL(url, window.location.href);
      return this.options.allowedDomains.some(
        (domain) =>
          parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  }

  // 安全配置 DOMPurify
  configureDOMPurify() {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      // 处理外部资源
      ['src', 'href'].forEach((attr) => {
        if (node.hasAttribute(attr)) {
          const url = node.getAttribute(attr);
          if (SecureSandbox.isExternalResource(url)) {
            if (!this.isAllowedDomain(url)) {
              node.removeAttribute(attr);
            } else {
              // 强制安全属性
              node.setAttribute('rel', 'noopener noreferrer');
              if (node.nodeName && node.nodeName.toLowerCase() === 'a')
                node.setAttribute('target', '_blank');
            }
          }
        }
      });

      // 处理不安全的内联样式
      if (node.hasAttribute('style')) {
        const styles = node.getAttribute('style');
        if (styles && !SecureSandbox.isStyleContentSafe(styles)) {
          node.removeAttribute('style');
        }
      }
    });

    const ALLOWED_TAGS = [
      'a',
      'b',
      'blockquote',
      'br',
      'button',
      'code',
      'col',
      'colgroup',
      'dd',
      'div',
      'dl',
      'dt',
      'em',
      'footer',
      'form',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'i',
      'img',
      'input',
      'label',
      'li',
      'main',
      'nav',
      'ol',
      'optgroup',
      'option',
      'p',
      'pre',
      'section',
      'select',
      'span',
      'strong',
      'sub',
      'summary',
      'sup',
      'table',
      'tbody',
      'td',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'tr',
      'tt',
      'u',
      'ul',
      'video',
    ];

    const ALLOWED_ATTR = [
      'class',
      'id',
      'style',
      'src',
      'href',
      'target',
      'alt',
      'title',
      'width',
      'height',
      'type',
      'border',
      'cellpadding',
      'cellspacing',
      'colspan',
      'rowspan',
    ];

    if (this.options.allowStyles) ALLOWED_TAGS.push('style');
    if (this.options.allowScripts) ALLOWED_TAGS.push('script');
    if (this.options.allowIframes) {
      ALLOWED_TAGS.push('iframe');
      ALLOWED_ATTR.push(
        'frameborder',
        'allow',
        'sandbox',
        'allowfullscreen',
        'loading',
      );
    }

    return {
      ALLOWED_TAGS: [...ALLOWED_TAGS, ...(this.options.allowedTags || [])],
      ALLOWED_ATTR: [...ALLOWED_ATTR, ...(this.options.allowedAttrs || [])],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|#|data:image\/)/i, // 处理链接（如href、src）中的URI，防止JavaScript协议（如javascript:）的执行，只允许http、https、mailto、data:image安全协议
      ALLOW_DATA_ATTR: false, // 禁用data-*属性，如：<div data-user-input="<script>alert('XSS!');</script>"></div>，可以通过document.querySelector('div').dataset.userInput获取脚本，防止XSS攻击
      FORBID_TAGS: [...(this.options.forbidTags || [])],
      FORBID_ATTR: ['on*', ...(this.options.forbidAttr || [])], // 移除内联JavaScript事件，防止跨站点脚本攻击，如<img src="xxx.jpg" onload="alert(1)" /> <audio onerror="alert('Error loading audio!');" src="xxx.mp3" controls></audio> 等
      RETURN_DOM_FRAGMENT: true, // 默认返回DOMfragment对象
    };
  }

  // 安全的样式隔离
  scopedStyles(styles, sid) {
    if (!this.options.allowStyles) return;

    Array.from(styles).forEach((style) => {
      const styleText = style.textContent;
      if (!styleText) return;

      if (!SecureSandbox.isStyleContentSafe(styleText)) {
        style.remove();
      } else {
        // 使用更可靠的 CSS 作用域化方法
        const scopedCSS = styleText.replace(/([^{]+?\{[^}]*\})/g, (selectors) =>
          selectors
            .split(',')
            .map((selector) => {
              const trimmed = selector.trim();
              if (trimmed.startsWith('@')) return trimmed; // 保持媒体查询
              return `.${sid} ${trimmed}`;
            })
            .join(', '),
        );

        style.textContent = scopedCSS;
      }
    });
  }

  // 异步加载和验证脚本
  loadScripts(scripts, sid) {
    if (!this.options.allowScripts) return;
    if (!this.vm) this.createIframeSandbox();

    Array.from(scripts).forEach(async (script) => {
      if (script.src) {
        fetch(script.src)
          .then((response) => {
            if (!response.ok) {
              console.error(`获取脚本代码失败: ${script.src}`);
              return;
            }

            return response.text();
          })
          .then((code) => {
            const content = code.trim();
            if (content && SecureSandbox.isScriptContentSafe(content)) {
              this.executeScriptsInSandbox(content, sid);
            }
          });
      } else {
        // 内联脚本
        const content = (script.textContent || script.value).trim();
        if (content && SecureSandbox.isScriptContentSafe(content)) {
          this.executeScriptsInSandbox(content, sid);
        }
      }
    });
  }

  executeScriptsInSandbox(code) {
    if (!this.options.allowScripts || code.length === 0) return;
    if (!this.vm) this.createIframeSandbox();

    const $window = this.vm.window;

    setTimeout(() => {
      const content = code.replace(/<\/?(code|pre|p|br)>/gi, ''); // 如果脚本放在textarea.script中，去除多余标签

      // eslint-disable-next-line
      const resolver = new Function(`
        return function (window, document, location, history, localStorage, sessionStorage) {
          try {
            ${content}
          } catch (e) {
            console.log(e);
          }
        }
      `);

      resolver().call(
        $window,
        $window,
        $window.document,
        $window.location,
        $window.history,
        $window.localStorage,
        $window.sessionStorage,
      );
    }, 100);
  }

  // 主处理方法
  processHTML(htmlContent) {
    // 设置容器id
    const sid = `sandbox-${uuid().replace(/-/g, '')}`;
    const wrappedContent = `<div class="sandbox-wrapper">${htmlContent}</div>`; // 为了安全，将htmlContent包裹在一层容器中,这很重要

    const cleanConfig = this.configureDOMPurify();
    const sanitized = DOMPurify.sanitize(wrappedContent, cleanConfig);

    const styles = sanitized.querySelectorAll('style');
    if (styles.length) this.scopedStyles(styles, sid);

    const scripts = sanitized.querySelectorAll('script, textarea.script'); // textarea.script作为预置可以存放脚本的特殊标签
    if (scripts.length) this.loadScripts(scripts, sid);

    const container = document.createElement('div');
    container.className = sid;
    container.appendChild(sanitized);

    return container.outerHTML;
  }
}

export default SecureSandbox;
