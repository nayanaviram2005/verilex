import { useEffect, useState } from 'react';

/**
 * Prevents skeleton flash on fast responses: a page that's already
 * `loading` only starts showing its skeleton after `delay` ms of
 * continuous loading. A response that lands before the delay elapses
 * never shows a skeleton at all. Resets as soon as loading ends.
 */
export function useDelayedLoading(loading, delay = 200) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);

  return show;
}
