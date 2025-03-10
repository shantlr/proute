// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractReturnType<T> = T extends (...args: any[]) => any
  ? NonNullable<Awaited<ReturnType<T>>>
  : T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractReturnTypeItem<T> = T extends (...args: any[]) => any
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    NonNullable<Awaited<ReturnType<T>>> extends any[]
    ? NonNullable<Awaited<ReturnType<T>>>[number]
    : never
  : never;

export const identity = <T>(arg: T) => arg;

export const returnType = <T>(arg: ExtractReturnType<T>) => arg;

export const returnTypeItem = <T>(arg: ExtractReturnTypeItem<T>) => arg;

export const returnArrayItemType = <T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arg: ExtractReturnType<T> extends any[]
    ? ExtractReturnType<T>[number]
    : never,
) => arg;

export const combineReturnTypes = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, any>,
>(arg: {
  [K in keyof T]: ExtractReturnType<T[K]>;
}) => arg;
