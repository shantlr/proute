// import { Middleware } from './types';

// // export const createMiddleware = <Params, NextParams>(
// //   fn: (params: Params) => NextParams | Promise<NextParams>,
// // ): Middleware<Params, NextParams> => {
// //   const middleware: Middleware<Params, NextParams> = async (
// //     params: Params,
// //   ): Promise<NextParams> => {
// //     return fn(params);
// //   };
// //   middleware.chain = () => {
// //     return createMiddleware(() => {});
// //   };

// //   return middleware;
// // };
