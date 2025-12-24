const isConstructor = (fn) => fn.prototype && fn.prototype.constructor === fn;

export default class Window {
  constructor(frame) {
    const { contentWindow: w } = frame;
    return new Proxy(w, {
      set(target, prop, value) {
        if (window[prop]) {
          console.log(`父容器已经存在 ${prop.toString()} 属性或者方法`);
        } else {
          window[prop] = value;
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
            return window.document;
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
