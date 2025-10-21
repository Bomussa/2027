import React from 'react'
import { cn } from '../lib/utils'

const Input = React.forwardRef(({ className, type, pattern, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
      pattern={pattern}
    />
  )
})
Input.displayName = "Input"

// FormField component for enhanced form inputs with labels and hints
const FormField = ({ label, hint, error, children, className }) => {
  const id = React.useId()
  const child = React.isValidElement(children) 
    ? React.cloneElement(children, { 
        id, 
        className: cn("input", children.props?.className || '')
      }) 
    : children
  
  return (
    <div className={cn("field", className)}>
      <label htmlFor={id} style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--c-text)'}}>{label}</label>
      {child}
      <div style={{display:'flex', gap:'8px', minHeight:'20px'}}>
        {error ? (
          <span style={{color:'var(--c-error)', fontSize:'12px'}}>• {error}</span>
        ) : hint ? (
          <span style={{color:'var(--c-muted)', fontSize:'12px'}}>{hint}</span>
        ) : null}
      </div>
    </div>
  )
}

export { Input, FormField }
