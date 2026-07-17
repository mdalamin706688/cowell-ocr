import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumen/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "btn-lumen text-white",
        secondary: "btn-surface",
        outline: "btn-surface",
        elevated: "btn-elevated",
        ghost: "btn-ghost-premium",
        forest: "forest-panel text-white rounded-xl font-semibold shadow-lg shadow-forest/15 hover:brightness-110 active:scale-[0.985]",
        destructive:
          "rounded-xl font-semibold bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92 active:scale-[0.985]",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 rounded-xl px-4 text-xs font-semibold",
        lg: "h-11 rounded-xl px-6 text-sm font-semibold",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
