import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// writeText inside a click needs no permission prompt. readText, which would be
// needed to *capture* the system clipboard automatically, does prompt and is not
// supported in Firefox or Safari — so pasting stays a plain textarea.
export function CopyButton({ value, label = "Copy", size = "sm", variant = "outline", className }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // insecure context or denied; leave the button unchanged
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button type="button" size={size} variant={variant} onClick={copy} className={className}>
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
