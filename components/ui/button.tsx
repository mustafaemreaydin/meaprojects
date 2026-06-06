"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13.5px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        primary:
          "bg-ink-900 text-paper-50 hover:bg-ink-700 active:bg-ink-800 shadow-sm dark:bg-paper-50 dark:text-ink-900 dark:hover:bg-paper-200",
        secondary:
          "bg-transparent border border-ink-200 text-ink-700 hover:bg-paper-200 hover:border-ink-300 dark:border-ink-600 dark:text-paper-100 dark:hover:bg-ink-700 dark:hover:border-ink-500",
        ghost:
          "bg-transparent text-ink-600 hover:bg-paper-200 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-700 dark:hover:text-paper-100",
        danger:
          "bg-[var(--danger)] text-white hover:opacity-85 active:opacity-75",
        link: "bg-transparent text-ink-500 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm:   "h-8 px-3 text-[12.5px] rounded-md",
        md:   "h-10 px-4",
        lg:   "h-12 px-6 text-[14.5px]",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
