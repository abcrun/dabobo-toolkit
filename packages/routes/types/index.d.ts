declare module "@dabobo/routes" {
  import { Context } from "webpack-env";

  interface RouteTreeNode {
    path: string;
    isLayout: boolean;
    id: number;
    key: string;
    redirect: string | null;
    component?: any;
    children: RouteTreeNode[]; 
  }

  interface RouteFlatNode {
    path: string;
    isLayout: boolean;
    id: number;
    key: string;
    parentId: number | null;
    redirect: string | null;
    component?: any;
  }


  // Routes 是一个包含 RouteTreeNode 的数组
  export type Routes = RouteTreeNode[];
  // RoutesTreeArray 是一个包含 RouteFlatNode 的数组
  export type RoutesTreeArray = RouteFlatNode[];
  


  /**
   * @param context Webpack 的 require.context 对象
   * @param reg (可选) 用于过滤文件的正则表达式
   * @param interceptor (可选) 拦截器函数，接收每个路由信息（RouteFlatNode），可返回部分修改或void
   */
  declare function createRoutes(
    context: Context,
    reg?: RegExp,
    interceptor?: (route: RouteFlatNode) => Partial<RouteFlatNode> | void
  ): {
    routes: Routes;
    routesTreeArray: RoutesTreeArray;
  };

  export default createRoutes;
}