export interface Middleware<Params, NextParams> {
  (params: Params): NextParams | Promise<NextParams>;
  chain<ChainNextParams>(
    nextMiddleware: (params: NextParams) => ChainNextParams,
  ): Middleware<Params, ChainNextParams>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMiddleware = Middleware<any, any>;
