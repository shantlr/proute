export {
  endpointConf,
  createRoute,
  isRouteEndpointModule,
} from './create-endpoint';

export type {
  RouteConfig,
  EndpointConf,
  EndpointHandler,
} from './create-endpoint/type';

export type { Method } from './types';

export {
  createResourceMap,
  createResource,
  identity,
  returnType,
} from './resources';
