export type AsyncGeneration = {
  capture: () => number;
  invalidate: () => number;
  isCurrent: (token: number) => boolean;
};

export const createAsyncGeneration = (): AsyncGeneration => {
  let current = 0;

  return {
    capture: () => current,
    invalidate: () => ++current,
    isCurrent: (token) => token === current,
  };
};
