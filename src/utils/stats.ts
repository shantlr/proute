import { Stats } from 'fs';
import { stat } from 'fs/promises';

export const pathStat = async (pathLike: string): Promise<Stats | null> => {
  try {
    return await stat(pathLike);
  } catch {
    return null;
  }
};
