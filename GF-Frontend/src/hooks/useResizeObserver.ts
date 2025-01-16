import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

export const useResizeObserver = (ref: React.RefObject<HTMLElement>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(
      debounce((entries) => {
        if (!entries.length) return;

        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }, 100)
    );

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [ref]);

  return dimensions;
}; 