export default class SSEClient {
  constructor() {
    this.eventHandlers = new Map();
    this.controller = null;
    this.reconnectInterval = 1000;
    this.lastEventId = null;
    this.isConnecting = false;
  }

  addEventListener(event, handler) {
    this.eventHandlers.set(event, handler);
  }

  removeEventListener(event) {
    this.eventHandlers.delete(event);
  }

  async connect(url, options = {}) {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.controller = new AbortController();

      const response = await fetch(url, {
        method: 'POST',
        ...options,
        signal: this.controller.signal,
        headers: {
          ...options.headers,
          ...(this.lastEventId && { 'Last-Event-ID': this.lastEventId }),
        },
      });

      if (!response.ok) {
        this.handleError(new Error(`HTTP ${response.status}`));
        return;
      }

      await this.processStream(response);
    } catch (err) {
      this.handleError(err);
    } finally {
      this.isConnecting = false;
    }
  }

  // 流数据处理
  async processStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await reader.read();
        if (done) {
          this.handleClose();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = this.parseBuffer(buffer);
      }
    } catch (err) {
      this.handleError(err);
    } finally {
      reader.releaseLock();
    }
  }

  // 缓冲区解析
  parseBuffer(buffer) {
    let eventEnd = buffer.indexOf('\n\n');
    let updatedBuffer = buffer;
    while (eventEnd !== -1) {
      const chunk = updatedBuffer.slice(0, eventEnd);
      updatedBuffer = updatedBuffer.slice(eventEnd + 2);
      this.parseEvent(chunk);
      eventEnd = updatedBuffer.indexOf('\n\n');
    }
    return updatedBuffer;
  }

  // 事件解析器
  parseEvent(rawEvent) {
    let eventType = 'message';
    const eventData = {
      data: '',
      id: null,
      retry: null,
    };

    rawEvent.split('\n').forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) return;

      const field = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      switch (field) {
        case 'event':
          eventType = value;
          break;
        case 'data':
          eventData.data += `${value}\n`;
          break;
        case 'id':
          eventData.id = value;
          this.lastEventId = value;
          break;
        case 'retry':
          eventData.retry = parseInt(value, 10);
          if (!Number.isNaN(eventData.retry)) {
            this.reconnectInterval = eventData.retry;
          }
          break;
        default:
          break;
      }
    });

    // 如果收到流关闭事件，则客户端主动关闭连接
    if (eventType === 'close') {
      this.controller.abort();
      this.handleClose(eventData);
    } else {
      eventData.data = eventData.data.trimEnd();
      this.dispatchEvent(eventType, eventData);
    }
  }

  // 事件分发
  dispatchEvent(type, detail) {
    const handler = this.eventHandlers.get(type);
    if (handler) {
      handler(detail);
    }
  }

  handleClose(detail) {
    const closeHandler = this.eventHandlers.get('close');
    if (closeHandler) {
      closeHandler(detail);
    }
  }

  // 错误处理
  handleError(err) {
    // 忽略中止错误
    if (err?.error?.name === 'AbortError') return;

    const errorHandler = this.eventHandlers.get('error');
    if (errorHandler) {
      errorHandler(err);
    }
  }

  // 中止连接
  abort() {
    this.controller.abort();

    const abortHandler = this.eventHandlers.get('abort');
    if (abortHandler) {
      abortHandler();
    }
  }
}
