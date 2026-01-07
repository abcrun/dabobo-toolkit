# @dabobo/routes

## 描述
`@dabobo/routes` 是一个用于根据文件路径自动生成路由的工具。

## 安装
使用 npm 安装：

```sh
npm install @dabobo/routes
```

## 使用方法


在您的项目中导入并使用 `createRoutes` 函数：

```js
import createRoutes from '@dabobo/routes';

// 示例 context
const context = require.context('./pages', true, /\.page\.js$/);
// const context = import.meta.glob('./views/**/*.vue');

// 创建路由，使用interceptor拦截和修改每个路由信息
const { routes, routesTreeArray } = createRoutes(context, (route) => {
    // 可在此处对每个路由对象进行自定义处理
    // 例如：添加meta信息，或修改component对象等
    return {
        ...route,
        meta: { requiresAuth: true },
    };
});

console.log(routes);
console.log(routesTreeArray);
```

## API


`createRoutes(context, [reg], [interceptor])`


##### 参数

* `context`：Webpack 的 `require.context` 对象。
* `reg` (可选)：正则表达式，用于过滤文件。
* `interceptor` (可选)：拦截器函数，接收每个路由信息（包含 path、id、key、parentId、redirect、component 等），可对其进行修改并返回新的路由对象。

> ⚠️ 说明：如果只传递一个函数作为第二参数，则会被视为 `interceptor`。

##### 返回值

* `routes`：树形结构的路由数组。
* `routesTreeArray`：扁平化的路由数组。

## 文件夹特殊命名规则

* `__layout`：以 `__layout` 结尾的文件会被视为其相应目录下的共用布局组件。例如，`/user/__layout.js` 会被应用到 `/user` 目录下的所有路由。
* `$id`：以 `$` 开头的文件夹会被转换成 `:`，用于动态路由参数。例如，`/user/$id/profile.js` 会被转换成 `/user/:id/profile`。

## 示例

假设项目结构如下：

```
src/
  pages/
    __layout.js
    index.js
    about.js
    user/
      __layout.js
      $id/
        profile.js
```

使用 `createRoutes` 函数生成的 `routes` 结构如下：

```js
[
    {
        path: '/',
        id: 1,
        key: './__layout.js',
        parentId: null,
        redirect: '/index',
        component, // 依赖于handler
        children: [
            {
                path: '/index',
                id: 2,
                key: './index.js',
                parentId: 1,
                redirect: null,
                component, // 依赖于handler
                children: [],
            },
            {
                path: '/about',
                id: 3,
                key: './about.js',
                parentId: 1,
                redirect: null,
                component, // 依赖于handler
                children: [],
            },
            {
                path: '/user',
                id: 4,
                key: './user/__layout.js',
                parentId: 1,
                redirect: null,
                component, // 依赖于handler
                children: [
                    {
                        path: '/user/:id/profile',
                        id: 5,
                        key: './user/$id/profile.js',
                        parentId: 4,
                        component, // 依赖于handler
                        children: [],
                    }
                ],
            },
        ]
    }
]
```

## 许可证
MIT