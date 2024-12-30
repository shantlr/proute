export type OpenApiTypeRef = {
  $ref: string;
};
export type OpenApiTypeString = {
  type: 'string';
};

export type OpenApiType = OpenApiTypeRef | OpenApiTypeString;

export type OpenApiSecurityScheme =
  | {
      type: 'http';
      scheme: 'basic' | 'bearer';
    }
  | {
      type: 'apiKey';
      in: 'header' | 'query' | 'cookie';
      name: string;
    }
  | {
      type: 'openIdConnect';
      openIdConnectUrl: string;
    }
  | {
      type: 'oauth2';
      flows: {
        authorizationCode: {
          authorizationUrl: string;
          tokenUrl: string;
          scopes: Record<string, string>;
        };
      };
    };
export type AnyOpenApiSecuritySchemes = Record<string, OpenApiSecurityScheme>;

export type OpenApiRouteSecurity<
  SecuritySchemes extends AnyOpenApiSecuritySchemes,
> =
  | keyof SecuritySchemes
  | { [K in keyof SecuritySchemes]: true | { scopes: string[] } };
