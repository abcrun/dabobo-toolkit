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
 - `allowedTags` (string[]): 额外允许的标签。
 - `allowedAttrs` (string[]): 额外允许的属性。

 ## 主要方法
 ### processHTML(htmlContent)
 安全处理并渲染 HTML 内容。
 ```js
 const safeHtml = sandbox.processHTML('<div><script>alert(1)</script></div>');
 ```
 返回安全的 HTML 字符串。

 ### destroy()
 销毁沙箱，恢复拦截的属性。

 ## 关键实现说明
 - **DOMPurify 配置**：通过 afterSanitizeAttributes 钩子处理 src、href、style 等属性，自动去除不安全内容。
 - **样式隔离**：将 style 内容作用域化，防止全局污染。
 - **脚本执行**：仅在 allowScripts 为 true 时，异步加载并在 iframe 沙箱中执行安全脚本。
 - **外部资源校验**：仅允许白名单域名的资源。

 ## 示例
 ```js
 import SecureSandbox from './index.js';

 const sandbox = new SecureSandbox({
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