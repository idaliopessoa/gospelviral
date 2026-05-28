import { useEffect, useState } from 'react';

/**
 * Cycle through `messages` on a fixed interval while `active` is true.
 * Resets to 0 each time `active` flips on.
 */
export function useLoadingRotation(messages, active, intervalMs) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    setStep(0);
    const id = setInterval(() => {
      setStep((s) => (s + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, messages, intervalMs]);

  return step;
}
