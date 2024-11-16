export type PluginOptions = {
  inputPath: string;
  resourcesPath?: string;
  outputRouter?: string;
  outputBaseConf?: string;
  docs?: {
    /**
     * Enable or disable all docs features
     */
    enabled?: boolean;
    /**
     * Endpoint that serve rapidoc
     */
    uiEndpoint: string;
    uiEnabled?: boolean;
    /**
     * Endpoint that serve the openapi json
     * @default $uiEndpoint/openapi.json
     */
    jsonEndpoint?: string;
    specs?: {
      info?: {
        title?: string;
        description?: string;
        version?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } & Record<string, any>;
      servers: ({
        url: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } & Record<string, any>)[];
    };
  };
};
export type ResolvedOptions = PluginOptions & {
  resourcesPath: string;
  outputRouter: string;
  outputBaseConf: string;
};
