import { isConstructor } from '../utils.js';

import Document from './document.js';

export default class Window {
  constructor(frame, documentScope) {
    const { contentWindow: w } = frame;
    window.$sandbox = {};

    return new Proxy(w, {
      set(target, prop, value) {
        if (window.$sandbox[prop]) {
          console.log(`父容器已经存在 ${prop.toString()} 属性或者方法`);
        } else {
          window.$sandbox[prop] = value;
        }

        w[prop] = value;

        return true;
      },
      get(target, prop) {
        switch (prop) {
          case 'top':
          case 'self':
          case 'parent':
          case 'globalThis':
          case 'window':
            return w;
          case 'document':
            return new Document(frame, documentScope);
          case 'localStorage':
          case 'sessionStorage':
            return null;
          default:
            break;
        }

        const value = target[prop];
        if (typeof value === 'function' && !isConstructor(value)) {
          return value.bind && value.bind(target);
        }

        return value;
      },
    });
  }
}
