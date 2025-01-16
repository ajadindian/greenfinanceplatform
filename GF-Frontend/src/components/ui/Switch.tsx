import * as React from "react"
import { motion } from "framer-motion"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const [checked, setChecked] = React.useState(props.checked || false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setChecked(event.target.checked)
      onCheckedChange?.(event.target.checked)
    }

    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <div className={`
          w-11 h-6 bg-gray-200 rounded-full peer 
          dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-300 
          dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full 
          peer-checked:after:border-white after:content-[''] after:absolute 
          after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 
          after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
          dark:border-gray-600 peer-checked:bg-blue-600
        `}>
          <motion.div
            className="absolute top-0.5 left-[2px] bg-white rounded-full h-5 w-5 transition-all"
            animate={{
              translateX: checked ? "100%" : "0%"
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
      </label>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
