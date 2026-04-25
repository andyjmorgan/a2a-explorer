import { useState } from "react";
import { Braces } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JsonViewer } from "@/components/ui/json-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface RawTurn {
  request?: unknown;
  response?: unknown;
}

interface RawViewerButtonProps {
  raw: RawTurn;
  className?: string;
}

export function RawViewerButton({ raw, className }: RawViewerButtonProps) {
  const [open, setOpen] = useState(false);
  const hasRequest = raw.request !== undefined;
  const hasResponse = raw.response !== undefined;
  if (!hasRequest && !hasResponse) return null;

  const initial = hasResponse ? "response" : "request";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View raw JSON"
        className={`p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer ${className ?? ""}`}
      >
        <Braces className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col p-0"
        >
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="text-sm font-semibold">Raw JSON-RPC envelope</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={initial} className="flex-1 min-h-0 flex flex-col px-5 pb-5">
            <TabsList className="self-start">
              {hasRequest && <TabsTrigger value="request">Request</TabsTrigger>}
              {hasResponse && <TabsTrigger value="response">Response</TabsTrigger>}
            </TabsList>
            {hasRequest && (
              <TabsContent value="request" className="flex-1 min-h-0 overflow-auto rounded-lg border border-border/40 bg-muted/30 mt-2">
                <JsonViewer data={raw.request} collapsed={3} />
              </TabsContent>
            )}
            {hasResponse && (
              <TabsContent value="response" className="flex-1 min-h-0 overflow-auto rounded-lg border border-border/40 bg-muted/30 mt-2">
                <JsonViewer data={raw.response} collapsed={3} />
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
