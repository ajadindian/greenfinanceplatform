import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  arrow,
  useTransitionStyles,
} from "@floating-ui/react"

const TooltipProvider = TooltipPrimitive.Provider
const UITooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={`z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-gray-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Add the new Tooltip interface
interface TooltipProps {
  label: string
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

// Add the new Floating UI-based Tooltip component
export const Tooltip = ({
  children,
  label,
  side = "top",
  align = "center",
}: TooltipProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const arrowRef = React.useRef(null);

  const {
    x,
    y,
    refs,
    strategy,
    context,
    middlewareData: { arrow: { x: arrowX, y: arrowY } = {} },
  } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: `${side}-${align}` as any,
    middleware: [
      offset(8),
      flip(),
      shift(),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context);
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const { isMounted, styles } = useTransitionStyles(context);

  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </div>
      {isMounted && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="z-50 rounded-md bg-gray-900 px-3 py-1.5 text-xs text-gray-50"
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              ...styles,
            }}
            {...getFloatingProps()}
          >
            {label}
            <div
              ref={arrowRef}
              className="absolute bg-gray-900 w-2 h-2 rotate-45"
              style={{
                left: arrowX != null ? `${arrowX}px` : '',
                top: arrowY != null ? `${arrowY}px` : '',
                [context.placement.split('-')[0]]: '-4px',
              }}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export { UITooltip, TooltipTrigger, TooltipContent, TooltipProvider }