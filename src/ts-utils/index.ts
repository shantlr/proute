export type Identity<T> = T;

export type FlattenType<T> = Identity<{
  [K in keyof T]: T[K];
}>;
