import { writeFile } from 'fs/promises';
import { RouterModules } from '../load-router/load-folder-tree/types';
import { formatImportPath } from '../utils/import-path';
import path from 'path';

/**
 * Generate default endpoint code for empty files
 */
export const generateDefaultEndpoints = async (
  router: RouterModules,
  options: {
    outputRoutes: string;
  },
) => {
  await Promise.all(
    router.modules.map(async (module) => {
      if (module.type !== 'endpoint' || !module.isFileEmpty) {
        return;
      }

      const lines: string[] = [];
      lines.push(`import { endpointConf, EndpointHandler } from 'proute';`);
      lines.push(`import { object } from 'valibot';`);
      lines.push('');
      lines.push(
        `import { ROUTES } from '${formatImportPath(
          path.parse(module.id).dir,
          options.outputRoutes,
        )}';`,
      );
      lines.push('');

      lines.push(
        `const conf = endpointConf(ROUTES.${module.method}['${module.expressPath}'], {`,
      );
      lines.push(`  responses: {`);
      lines.push(`    200: object({}),`);
      lines.push(`  },`);
      lines.push(`});`);
      lines.push('');

      lines.push(
        `const handler: EndpointHandler<typeof conf> = async ({}): ReturnType<EndpointHandler<typeof conf>> => {`,
      );
      lines.push(`  return {`);
      lines.push(`    status: 200,`);
      lines.push(`    data: {},`);
      lines.push(`  };`);
      lines.push(`};`);
      lines.push('');

      lines.push(`export default { conf, handler };`);
      lines.push('');

      await writeFile(module.id, lines.join('\n'));
    }),
  );
};
