import { createVitePlugin } from 'unplugin';
import { loadRouterModules } from '../load-router/load-folder-tree';
import path from 'path';
import {
  GENERATED_CODE_HEADER,
  generateRouterFile,
} from './generate-router-file';
import { writeFile, stat, readFile } from 'fs/promises';
import {
  generateBaseConf,
  GENERATED_BASE_CONF_HEADER,
} from './generate-base-conf';
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
    generateBaseConf(router, options).then(async (code) => {
      if (await isFileExists(options.outputBaseConf)) {
        const content = (await readFile(options.outputBaseConf)).toString();
        if (content.length && !content.startsWith(GENERATED_BASE_CONF_HEADER)) {
          throw new Error(
            `File ${options.outputBaseConf} is not generated by proute`,
          );
        }
        if (content === code) {
          return;
        }
      }

      await writeFile(options.outputBaseConf, code);
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

    resourcesPath:
      options.resourcesPath || path.resolve(options.inputPath, 'resources.ts'),

    outputRouter:
      options.outputRouter || path.resolve(options.inputPath, 'index.ts'),
    outputBaseConf:
      options.outputBaseConf || path.resolve(options.inputPath, 'base-conf.ts'),
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
