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
import { generateUtils } from './generate-utils';

const isFileExists = async (filePath: string) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const writeGeneratedCode = async (filePath: string, code: string) => {
  if (await isFileExists(filePath)) {
    const content = (await readFile(filePath)).toString();
    if (content.length && !content.startsWith(GENERATED_BASE_CONF_HEADER)) {
      throw new Error(`File ${filePath} is not generated by proute`);
    }
    if (content === code) {
      return;
    }
  }

  await writeFile(filePath, code);
};

const generate = async (options: ResolvedOptions) => {
  const router = await loadRouterModules(options.inputPath);

  await Promise.all([
    // Generate base conf
    generateRoutes(router, options).then(async (code) => {
      writeGeneratedCode(options.outputRoutes, code);
    }),

    // Generate router
    generateRouterFile(router, options).then(async (code) => {
      await writeGeneratedCode(options.outputRouter, code);
    }),

    generateUtils(options).then(async (code) => {
      await writeGeneratedCode(options.outputUtils, code);
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
    outputUtils:
      options.outputUtils || path.resolve(options.inputPath, 'proute.utils.ts'),
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
