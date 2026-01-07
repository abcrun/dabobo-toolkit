 # @dabobo/sandbox

 `SecureSandbox` 是一个用于安全隔离和渲染 HTML 内容的 JavaScript 库，适用于防止 XSS 攻击和资源越权访问。

 ## 主要特性
 - **DOMPurify 集成**：自动清理不安全标签和属性，防止恶意脚本注入。
 - **自定义安全选项**：可配置是否允许脚本、样式、iframe 及允许的域名、标签、属性等。
 - **样式隔离**：自动作用域化 style 标签，防止样式污染。
 - **脚本安全执行**：仅允许安全脚本在沙箱 iframe 中异步加载和执行。
 - **外部资源校验**：严格校验 src、href 等外链资源域名。

 ## 安装
 使用 npm 安装：

 ```sh
 npm install @dabobo/sandbox
 ```

 ## 构造参数
 ```js
 import SecureSandbox from '@dabobo/sandbox';

 const sandbox = new SecureSandbox(options);
 ```
 - `allowScripts` (boolean): 是否允许脚本执行，默认 false。
 - `allowIframes` (boolean): 是否允许 iframe 标签，默认 false。
 - `allowStyles` (boolean): 是否允许 style 标签，默认 true。
 - `allowedDomains` (string[] | RegExp[]): 允许外部资源的域名白名单。
 - `docScope` (string): 限制沙箱内 js 操作 document/elment 元素，必须在指定的 `docScope`(css selector) 内部进行 DOM 操作。
 - `allowedTags` (string[]): 额外允许的标签。
 - `allowedAttrs` (string[]): 额外允许的属性。

当设置 `allowScripts: true` 时，代码内是禁止通过 JS 设置如下危险属性，同时我们也不允许在沙箱内部通过 JS 创建 `LINK` 和 `IFRAME` 元素。

```js
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
```

另外如果解析的HTML包含 CSS 样式和内联的 JS 代码，还需要满足以下约束：

```js
const isStyleContentSafe = (content) => {
  const dangerousPatterns = [
    /@import/i,
    /expression\s*\(/i,
    /url\(\s*['"]?\s*javascript:/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
};

const isScriptContentSafe = (content) => {
  const dangerousPatterns = [
    /window\.(?:top|parent|frames?|opener)/i,
    /(?:window\.)?document\.(?:cookie|referrer|domain)/i,
    /(?:window\.)?location\.(?:href|hash|assign)/i,
    /(?:window\.)?history\.(?:pushState|replaceState)/i,
    /(?:window\.)?localStorage|sessionStorage|indexedDB/i,
    /(?:window\.)?(?:alert|eval\s*)\(/i,
    /<script|<iframe|<object|<embed/i,
    // /<[^<>]+on[a-z]+=/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
};
```

 ## 主要方法
 ### processHTML(htmlContent)
 安全处理并渲染 HTML 内容。
 ```js
 const safeHtml = sandbox.processHTML('<div>Hello World<script>alert(1)</script></div>');
 ```
 返回安全的 HTML 字符串。

 ### destroy()
 销毁沙箱，恢复拦截的属性。

 ## 示例
 ```js
 import SecureSandbox from '@dabobo/sandbox';

 const sandbox = new SecureSandbox({
   docScope: '.sandbox-box',
   allowScripts: true,
   allowedDomains: ['trusted.com'],
 });

 const safeHtml = sandbox.processHTML('<a href="https://trusted.com">安全链接</a>');
 document.body.innerHTML = safeHtml;
 ```

 ## 注意事项
 - 默认禁止脚本和 iframe，需显式开启。
 - 仅允许安全协议（http, https, mailto, data:image）。
 - 禁用 data-* 属性，防止 dataset 注入。

 ## License
 MIT