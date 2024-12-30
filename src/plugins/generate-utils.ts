import path from 'path';
import { formatImportPath } from '../utils/import-path';
import { pathStat } from '../utils/stats';
import { GENERATED_BASE_CONF_HEADER } from './generate-routes';
import { ResolvedOptions } from './types';

export const generateUtils = async ({
  configPath,
  outputUtils,
}: Pick<ResolvedOptions, 'outputUtils' | 'configPath'>) => {
  const results: string[] = [GENERATED_BASE_CONF_HEADER, ''];

  results.push(`import { makeCreateMiddleware } from 'proute';`);
  const configStat = await pathStat(configPath);
  if (configStat?.isFile()) {
    results.push(
      `import routerConfig from '${formatImportPath(path.parse(outputUtils).dir, configPath)}';`,
    );
  }

  results.push('');

  if (configStat?.isFile()) {
    results.push(
      `export const createMiddleware = makeCreateMiddleware(routerConfig);`,
    );
  } else {
    results.push(`export const createMiddleware = makeCreateMiddleware();`);
  }

  return results.join('\n');
};
