import React from 'react';
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import './gridLayoutTheme.css';

interface DraggableChartProps {
  children: React.ReactNode;
  onDragStart: () => void;
  onDragEnd: (position: { x: number; y: number }) => void;
  style?: React.CSSProperties;
  className?: string;
  'data-chart-container'?: boolean;
  'data-chart-id'?: string;
}

export const DraggableChart = React.memo(({ 
  children, 
  onDragStart, 
  onDragEnd, 
  style,
  className,
  ...props
}: DraggableChartProps) => {
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }));
  
  const bind = useDrag(({ movement: [mx, my], last, first }) => {
    if (first) {
      onDragStart();
      document.body.classList.add('no-select');
    }
    api.start({ x: mx, y: my, immediate: true });
    if (last) {
      onDragEnd({ x: mx, y: my });
      api.start({ x: 0, y: 0 });
      document.body.classList.remove('no-select');
    }
  });

  return (
    <animated.div
      {...bind()}
      {...props}
      style={{
        ...style,
        x,
        y,
        touchAction: 'none',
        cursor: 'grab',
      }}
      className={`chart-container ${className}`}
    >
      {children}
    </animated.div>
  );
}); 