import { RouterModules } from './types';

export const sortExpressPathPriority = (
  routerModules: RouterModules,
): RouterModules => {
  const modules = [...routerModules.modules].sort((a, b) => {
    if (a.type === 'middleware') {
      return -1;
    }
    if (b.type === 'middleware') {
      return 1;
    }

    const splittedA = a.expressPath.split('/');
    const splittedB = b.expressPath.split('/');
    for (let i = 0; i < splittedA.length; i++) {
      if (splittedA[i] === splittedB[i]) {
        continue;
      }
      if (splittedA[i] && !splittedB[i]) {
        return 1;
      }
      if (!splittedA[i] && splittedB[i]) {
        return -1;
      }

      if (splittedA[i].startsWith(':') && !splittedB[i].startsWith(':')) {
        return 1;
      }
      if (!splittedA[i].startsWith(':') && splittedB[i].startsWith(':')) {
        return -1;
      }
      if (splittedA[i] < splittedB[i]) {
        return -1;
      }
      return splittedA[i].localeCompare(splittedB[i]);
    }
  });
  return {
    modules,
  };
};
