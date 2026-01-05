import Window from './window.js';

export default class VM {
  constructor(frame, documentScope) {
    this.iframe = frame;
    this.window = new Window(frame, documentScope);
  }
}
