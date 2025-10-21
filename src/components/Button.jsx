import React from 'react'
import { cn } from '../lib/utils'

const Button = React.forwardRef(({ className, variant = "default", size = "default", icon, children, ...props }, ref) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    gradient: "gradient-primary text-white hover:opacity-90",
    gradientSecondary: "gradient-secondary text-white hover:opacity-90"
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10"
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {icon && <span className="inline-flex items-center justify-center" style={{marginInlineEnd: children ? '0.5rem' : '0'}}>{icon}</span>}
      {children && <span className="baseline">{children}</span>}
    </button>
  )
})

Button.displayName = "Button"

// IconButton component for icon-only buttons with enhanced touch target
const IconButton = React.forwardRef(({ className, icon, label, ...props }, ref) => {
  return (
    <button
      className={cn(
        "icon-btn inline-flex items-center justify-center",
        className
      )}
      aria-label={label}
      ref={ref}
      {...props}
    >
      <span className="optical-center">{icon}</span>
    </button>
  )
})

IconButton.displayName = "IconButton"

// IconBadge component for displaying numbers in badges
const IconBadge = ({ value, tabular = true, className }) => {
  return (
    <span className={cn("icon-badge", tabular && "tabular", className)}>
      {value}
    </span>
  )
}

// StatTile component for displaying KPIs
const StatTile = ({ label, value, icon, className }) => {
  return (
    <div className={cn("card", className)} style={{display:'grid', gridTemplateColumns: icon?'auto 1fr':'1fr', gap:'12px', alignItems:'center'}}>
      {icon && (
        <div className="optical-center" style={{inlineSize:'36px', blockSize:'36px', borderRadius:'10px', background:'color-mix(in oklab, var(--c-primary) 12%, white)', color:'var(--c-primary)'}}>
          {icon}
        </div>
      )}
      <div>
        <div className="p" style={{margin:0, fontSize: '0.875rem', color: 'var(--c-muted)'}}>{label}</div>
        <div className="tabular" style={{fontSize:'1.5rem', fontWeight:800, letterSpacing:'.01em'}}>{value}</div>
      </div>
    </div>
  )
}

export { Button, IconButton, IconBadge, StatTile }
