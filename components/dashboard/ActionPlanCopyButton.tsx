'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  text: string;
}

export function ActionPlanCopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: no-op if clipboard unavailable
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="text-xs shrink-0"
    >
      {copied ? '✓ Copied' : '📋 Copy as WhatsApp message'}
    </Button>
  );
}
