import { createVitePlugin } from 'unplugin';
import { loadRouterModules } from '../load-router/load-folder-tree';
import path from 'path';
import {
  GENERATED_CODE_HEADER,
  generateRouterFile,
} from './generate-router-file';
import { writeFile, stat, readFile } from 'fs/promises';
import { generateRoutes, GENERATED_BASE_CONF_HEADER } from './generate-routes';
import { generateDefaultEndpoints } from './generate-default-endpoints';
import { PluginOptions, ResolvedOptions } from './types';

const isFileExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const generate = async (options: ResolvedOptions) => {
  const router = await loadRouterModules(options.inputPath);

  await Promise.all([
    // Generate base conf
    generateRoutes(router, options).then(async (code) => {
      if (await isFileExists(options.outputRoutes)) {
        const content = (await readFile(options.outputRoutes)).toString();
        if (content.length && !content.startsWith(GENERATED_BASE_CONF_HEADER)) {
          throw new Error(
            `File ${options.outputRoutes} is not generated by proute`,
          );
        }
        if (content === code) {
          return;
        }
      }

      await writeFile(options.outputRoutes, code);
    }),

    // Generate router
    generateRouterFile(router, options).then(async (code) => {
      if (await isFileExists(options.outputRouter)) {
        const content = (await readFile(options.outputRouter)).toString();
        if (content.length && !content.startsWith(GENERATED_CODE_HEADER)) {
          throw new Error(
            `File ${options.outputRouter} is not generated by proute`,
          );
        }
        if (content === code) {
          return;
        }
      }

      await writeFile(options.outputRouter, code);
    }),

    // Generate default endpoints
    generateDefaultEndpoints(router, options),
  ]);
};

const onFileChange = async (
  fileId: string,
  change: {
    event: 'create' | 'update' | 'delete';
  },
  options: ResolvedOptions,
) => {
  console.log('FILE CHANGE', fileId);
};

export const prouteVitePlugin = createVitePlugin((options: PluginOptions) => {
  const opt = {
    ...options,

    configPath:
      options.configPath || path.resolve(options.inputPath, 'config.ts'),
    resourcesPath:
      options.resourcesPath || path.resolve(options.inputPath, 'resources.ts'),
    outputRouter:
      options.outputRouter ||
      path.resolve(options.inputPath, 'proute.generated.router.ts'),
    outputRoutes:
      options.outputRoutes ||
      path.resolve(options.inputPath, 'proute.generated.routes.ts'),
  };

  return {
    name: 'proute',
    watchChange: async (id, change) => {
      await onFileChange(id, change, opt);
    },
    vite: {
      async configResolved() {
        await generate(opt);
      },
    },
  };
});
