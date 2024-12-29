export type Identity<T> = T;

export type FlattenType<T> = Identity<{
  [K in keyof T]: T[K];
}>;

type NonOptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K]
    ? never
    : [T[K]] extends [never]
      ? never
      : K;
}[keyof T];

export type PickNonOptional<T> = Pick<T, NonOptionalKeys<T>>;
