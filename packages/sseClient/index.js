export default class SSEClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.controller = null;
    this.lastEventId = null;

    this.eventHandlers = new Map();
    this.retrySchedule = [];
    this.isConnecting = false;
    this.timeout = null;
  }

  addEventListener(event, handler) {
    this.eventHandlers.set(event, handler);
  }

  removeEventListener(event) {
    this.eventHandlers.delete(event);
  }

  clear() {
    this.eventHandlers.clear();
    this.retrySchedule = [];
  }

  async connect(eventId = null) {
    if (this.isConnecting) return;
    if (this.timeout) clearTimeout(this.timeout);
    this.isConnecting = true;

    this.timeout = setTimeout(() => {
      this.handleTimeout();
    }, this.options.timeout || 60000);

    try {
      this.controller = new AbortController();

      const headers = this.options.headers || {};
      delete this.options.headers;

      const response = await fetch(this.url, {
        method: 'POST',
        signal: this.controller.signal,
        ...this.options,
        headers: {
          ...headers,
          'Last-Event-ID': eventId || this.lastEventId || '',
        },
      });

      if (!response.ok) {
        this.handleError(new Error(`HTTP ${response.status}`));
        return;
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/event-stream')) {
        await this.processStream(response);
      } else if (contentType.includes('application/json')) {
        const data = await response.json();
        this.dispatchEvent('message', { data: JSON.stringify(data) });
        this.handleClose();
      }
    } catch (err) {
      this.handleError(err);
    } finally {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.controller.signal.aborted || this.retrySchedule.length === 0) {
      this.isConnecting = false;
      this.retrySchedule = []; // 如果是aborted需要清空重试队列
      this.timeout = null;
      return;
    }

    const lastRetry = this.retrySchedule.shift();
    setTimeout(() => {
      this.connect(lastRetry.id);

      const retryHandler = this.eventHandlers.get('retry');
      if (retryHandler) {
        retryHandler(lastRetry);
      }
    }, lastRetry.retry);
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

    // 接收到数据后，清除超时定时器
    if (buffer && this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

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
      time: new Date().getTime(),
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
          eventData.data += `${value}`;
          break;
        case 'id':
          eventData.id = value;
          this.lastEventId = value;
          break;
        case 'retry':
          eventData.retry = parseInt(value, 10);
          if (!Number.isNaN(eventData.retry))
            this.retrySchedule.push(eventData);
          break;
        default:
          break;
      }
    });

    eventData.data = eventData.data.trimEnd();
    this.dispatchEvent(eventType, eventData);
  }

  // 事件分发
  dispatchEvent(type, detail) {
    const handler = this.eventHandlers.get(type);
    if (handler) {
      handler(detail);
    }
  }

  // 超时处理
  handleTimeout() {
    const timeoutHandler = this.eventHandlers.get('timeout');
    if (timeoutHandler) {
      timeoutHandler();
    }
  }

  // 连接关闭处理
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
    this.controller?.abort();
    this.retrySchedule = []; // 用户终止，清空重试队列

    const abortHandler = this.eventHandlers.get('abort');
    if (abortHandler) {
      abortHandler();
    }
  }
}
