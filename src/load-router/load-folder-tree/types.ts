import { Method } from '../../types';

export type EndpointModule = {
  type: 'endpoint';
  id: string;
  method: Method;
  expressPath: string;

  isFileEmpty: boolean;
};
export type MiddlewaresModule = {
  id: string;
  type: 'middleware';
};

export type ModuleTreeNode = {
  /**
   * @example "api" "v1" "$id"
   */
  pattern: string;

  middlewares: MiddlewaresModule[];
  endpoints: EndpointModule[];
  childen: Record<string, ModuleTreeNode>;
};

export type RouterModules = {
  // modules: (EndpointModule | MiddlewaresModule)[];
  modules: (
    | (EndpointModule & { middlewaresModuleIds: string[] })
    | MiddlewaresModule
  )[];
};
