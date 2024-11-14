import path from 'path';
import { RouterModules } from '../load-router/load-folder-tree/types';
import { pathStat } from '../utils/stats';
import { formatImportPath } from '../utils/import-path';

export const GENERATED_BASE_CONF_HEADER = `// This file is generated by kamel, do not edit it manually, it will be override`;

const extractParams = (expressPath: string) => {
  return expressPath
    .split('/')
    .filter((p) => p.startsWith(':'))
    .map((p) => {
      return p.slice(1);
    });
};
const formatFieldName = (name: string) => {
  if (/[a-zA-Z$_]([a-zA-Z0-9$_])*/.test(name)) {
    return name;
  }
  return `'${name}'`;
};

export const generateBaseConf = async (
  routerModules: RouterModules,
  {
    resourcesPath,
    outputBaseConf,
  }: {
    resourcesPath: string;
    outputBaseConf: string;
  },
) => {
  const results = [GENERATED_BASE_CONF_HEADER, ''];
  results.push(`import { object, string } from 'valibot';`);
  results.push(`import { createResourceMap } from 'kamel'`);

  const resPath = await pathStat(resourcesPath);
  if (resPath?.isFile()) {
    results.push(
      '',
      `import * as resources from '${formatImportPath(path.parse(outputBaseConf).dir, resourcesPath)}';`,
    );

    results.push(`export const RESOURCES = createResourceMap(resources);`, '');
  }

  results.push(`export const ROUTES = {`);

  const byMethod = routerModules.modules.reduce(
    (acc, module) => {
      if (module.type !== 'endpoint') {
        return acc;
      }
      if (!acc[module.method]) {
        acc[module.method] = [];
      }
      acc[module.method].push(module);
      return acc;
    },
    {} as Record<string, RouterModules['modules']>,
  );

  // Generate route params
  for (const method in byMethod) {
    results.push(`  ${method}: {`);
    for (const module of byMethod[method]) {
      if (module.type === 'endpoint') {
        const params = extractParams(module.expressPath);
        results.push(`    '${module.expressPath}': {`);
        if (params.length === 0) {
          results.push(`      params: object({}),`);
        } else {
          results.push(`      params: object({`);
          params.forEach((param) => {
            results.push(`        ${formatFieldName(param)}: string(),`);
          });
          results.push(`      }),`);
        }
        results.push(`    },`);
      }
    }
    results.push(`  },`);
  }
  results.push('};', '');

  return results.join('\n');
};
