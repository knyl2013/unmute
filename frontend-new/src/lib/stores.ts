// src/lib/stores.ts
import { readable } from 'svelte/store';

/**
 * A readable Svelte store that updates with the current Date every second.
 * It automatically handles starting and stopping the interval, so it's
 * highly efficient and won't run when no components are listening to it.
 */
export const now = readable(new Date(), (set) => {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  // This cleanup function is called by Svelte when the last subscriber unsubscribes
  return () => {
    clearInterval(interval);
  };
});