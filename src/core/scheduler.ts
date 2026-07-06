export interface Scheduler { every(milliseconds: number, callback: () => void): () => void }

export const createScheduler = (setIntervalFn: (callback: () => void, delay: number) => () => void): Scheduler => ({
  every: (milliseconds, callback) => setIntervalFn(callback, milliseconds),
});
