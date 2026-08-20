import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Matches Input: no box, just a bottom rule that responds to focus.
        "flex min-h-[80px] w-full resize-y rounded-none border-0 border-b border-b-[#cbb79a] bg-transparent px-0 py-2 text-base transition-colors placeholder:text-muted-foreground focus-visible:border-b-[#7a5a33] focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
