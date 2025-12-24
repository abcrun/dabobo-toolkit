import Window from './window.js';

export default class VM {
  constructor(frame) {
    this.iframe = frame;
    this.window = new Window(frame);
    // 其他的代理暂时先不需要
  }
}
