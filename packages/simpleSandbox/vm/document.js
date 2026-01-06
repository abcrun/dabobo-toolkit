export default class Document {
  constructor(frame, documentScope) {
    const { contentWindow: w } = frame;

    return new Proxy(w.document, {
      set(target, prop, value, receiver) {
        if (prop === 'cookie' || prop === 'domain' || prop === 'referrer') {
          console.log(`禁止在沙箱内设置 document.${prop} 属性`);
          return true;
        }

        return Reflect.set(target, prop, value, receiver);
      },
      get(target, prop, receiver) {
        const original = Reflect.get(target, prop, receiver);

        if (
          prop === 'createElement' ||
          prop === 'createElementNS' ||
          prop === 'createDocumentFragment'
        ) {
          return (...args) => {
            const element = window.document[prop](...args);
            element.dataset.createdInSandbox = 'true';

            return element;
          };
        }

        if (prop === 'cookie' || prop === 'domain' || prop === 'referrer') {
          console.log(`禁止在沙箱内访问 document.${prop} 属性`);
          return '';
        }

        if (
          prop === 'getElementById' ||
          prop === 'querySelector' ||
          prop === 'querySelectorAll' ||
          prop === 'getElementsByClassName' ||
          prop === 'getElementsByTagName' ||
          prop === 'getElementsByTagNameNS' ||
          prop === 'getElementsByName'
        ) {
          return (...args) => {
            const elm = window.document[prop](...args);

            if (elm.closest && elm.closest(documentScope)) {
              elm.dataset.createdInSandbox = 'true';

              return elm;
            }
            throw new Error(`禁止在沙箱中访问 "${args[0]}" 元素`);
          };
        }

        if (typeof original === 'function') {
          return window.document[prop].bind(target);
        }

        return original;
      },
    });
  }
}
