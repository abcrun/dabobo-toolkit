function buildTreeJSON(items) {
  const map = {}; // id到节点的映射表
  const roots = []; // 根节点列表

  // 初始化哈希表，每个节点添加children属性
  items.forEach((item) => {
    map[item.id] = { ...item, children: [] };
  });

  // 构建树结构
  items.forEach((item) => {
    const node = map[item.id];
    if (item.parentId != null && map[item.parentId]) {
      // 如果parentId存在且父节点存在，添加到父节点的children
      map[item.parentId].children.push(node);
    } else {
      // 否则作为根节点
      roots.push(node);
    }
  });

  return roots;
}

export default function createRoutes(context, ...args) {
  let reg = args[0]; // keys 过滤条件
  let interceptor = args[1];

  if (typeof reg === 'function') {
    interceptor = reg;
    reg = null;
  }

  const keys = context.keys ? context.keys() : Object.keys(context); // Object keys for vite -> import.metadata.glob('xxxx')

  const filters = reg ? keys.filter((key) => !reg.test(key)) : keys;

  const routesArray = filters.map((key, index) => {
    const path = key
      .substring(1) // 去头 .
      .replace(/\/\$/g, '/:') // 由于window系统目录命名规则要的约束，对于/:id/xxx，我们使用 /$id/xxx 代替， 此处需要转换回来
      .replace(/\.[^/]*$/, ''); // 去尾 .js|.jsx|.ts|.tsx|.vue 等
    const isLayout = /__layout$/i.test(path);

    // __layout 作为其所在 path 的组件
    const resolvePath = isLayout
      ? path.replace(/\/__layout$/i, '') || '/'
      : path;

    return {
      path: resolvePath,
      isLayout,
      id: index + 1,
      key,
    };
  });

  const getParentId = (url) => {
    const paths = url.replace(/^\//, '').split('/');
    let current = paths.pop();
    let parentId = null;

    while (current && !parentId) {
      const parent = routesArray.find(
        ({ path }) => path === `/${paths.join('/')}`,
      );
      if (parent) {
        parentId = parent.id;
      }

      current = paths.pop();
    }

    return parentId;
  };

  const getRedirectPath = (url) => {
    const target = `${url}/index`.replace(/\/+/, '/');
    const item = routesArray.find(({ path }) => path === target);

    return item ? item.path : null;
  };

  let routesTreeArray = routesArray.map((route) => {
    const parentId = getParentId(route.path);
    const redirect = route.isLayout ? getRedirectPath(route.path) : null;
    const component = context[route.key];

    const item = {
      ...route,
      parentId,
      redirect,
      component,
    };

    if (interceptor) {
      return {
        ...item,
        ...interceptor(item),
      };
    }

    return item;
  });
  const directoryRoutes = routesTreeArray
    .filter(({ path }) => /\/index$/.test(path))
    .filter((route) => {
      const path = route.path.replace(/index$/, '');
      const hasRoute = routesTreeArray.find((r) => path === r.path); // 如果hasRoute为true表示path既有__layout又有index，对于isLayout的path使用之前定义的redirect

      return !hasRoute;
    })
    .map((route, index) => {
      const path = route.path.replace(/\/index$/, '');

      return {
        ...route,
        id: filters.length + index + 1,
        path,
      };
    });

  routesTreeArray = routesTreeArray.concat(directoryRoutes);
  const routes = buildTreeJSON(routesTreeArray);

  return { routes, routesTreeArray };
}
