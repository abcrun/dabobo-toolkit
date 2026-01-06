# @dabobo/sse

## 描述
`@dabobo/sse` 一个用于处理 `text/stream` Event Stream 的 JavaScript 客户端库。

## 安装

```sh
npm install @dabobo/sse
```

## 使用方法

```js
import SSEClient from '@dabobo/sse';

const client = new SSEClient('https://your-sse-server.com/events', {});

client.on('message', (data) => {
  console.log('收到消息:', data);
});

client.connect();
```

## API

- `constructor(url, options)`：初始化客户端，参数为 SSE 服务端地址和可选配置。
- `connect()`：建立连接。
- `close()`：关闭连接。
- `on(event, callback)`：监听事件（如 message, close, error, abort）。

## 事件
如：

- `message`：收到新消息时触发。
- `error`：发生错误时触发。

## License

MIT