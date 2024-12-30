import { OpenApiSecurityScheme } from '../docs/types';

export type ProuteConfig<
  SecuritySchemes extends Record<string, OpenApiSecurityScheme>,
> = {
  securitySchemes?: SecuritySchemes;
};
export type AnyProuteConfig = ProuteConfig<
  Record<string, OpenApiSecurityScheme>
>;

/**
 * Apply some global configuration to router
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prouteConfig = <T extends ProuteConfig<any>>(config: T) => {
  return config;
};
