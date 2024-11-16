export const joinPath = (...paths: string[]) => {
  return paths.join('/').replace(/\/+/g, '/');
};
