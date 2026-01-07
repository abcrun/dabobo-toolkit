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

const client = new SSEClient('https://your-sse-server.com/events', {
   headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sessionId: 'xxxx',
    requestId: 'xxxx',
    query: 'xxxx',
  }),
});

client.on('message', (data) => {
  console.log('收到消息:', data);
});

// 正常情况下如果消息流输出结束，就会触发close事件；但是如果消息类型包含close的消息类型，detail则代表close类型消息的数据
client.on('close', (detail) => {
  console.log('结束了');
});

client.on('abort', () => {
  console.log('请求终止');
});

client.on('error', (error) => {
  console.log('请求终止');
});


client.connect();
```

## API

- `constructor(url, options)`：初始化客户端，参数为 SSE 服务端地址和可选配置。`options` 代表需要给接口传递的数据
- `connect()`：建立连接。
- `on(event, callback)`：监听事件（如 message, close, error, abort）。
- `abort()`：终止消息


## License

MIT