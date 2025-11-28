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
  

  declare function createRoutes(
    context: Context,
    reg?: RegExp,
    handler?: (key: string) => any
  ): {
    routes: Routes;
    routesTreeArray: RoutesTreeArray;
  };

  export default createRoutes;
}