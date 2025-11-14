
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CopyDocumentationLink({ candidateId, processId }: { candidateId?: string, processId?: string }) {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // This runs only on the client, avoiding hydration issues.
    setBaseUrl(`${window.location.origin}/documentation`);
  }, []);

  const handleCopy = () => {
    if (!baseUrl) {
      toast({
        variant: "destructive",
        title: "Cannot copy link",
        description: "The page has not fully loaded yet.",
      });
      return;
    }
    if (!processId || !candidateId) {
      toast({
        variant: "destructive",
        title: "Cannot copy link",
        description: "Could not find an active process or candidate.",
      });
      return;
    };
    
    const urlToCopy = `${baseUrl}?processId=${encodeURIComponent(processId)}&candidateId=${encodeURIComponent(candidateId)}`;

    navigator.clipboard.writeText(urlToCopy).then(() => {
      setIsCopied(true);
      toast({
        title: "Link Copied!",
        description: `The documentation link has been copied.`,
      });
      setTimeout(() => setIsCopied(false), 2000); // Reset icon after 2 seconds
    });
  };

  return (
     <Button onClick={handleCopy} disabled={!candidateId || !processId}>
        {isCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <LinkIcon className="mr-2 h-4 w-4" />}
        Copy Documentation Link
    </Button>
  );
}
