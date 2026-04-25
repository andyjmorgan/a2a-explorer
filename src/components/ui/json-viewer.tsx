import { useEffect, useState } from "react";
import ReactJson from "@microlink/react-json-view";

interface JsonViewerProps {
  data: unknown;
  collapsed?: number | boolean;
  name?: string | false;
  className?: string;
}

function isDocumentDark() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Themed wrapper around `@microlink/react-json-view`. Re-renders when the
 * `dark` class on the document root changes so theme switches don't leave
 * the viewer mismatched with the rest of the UI.
 */
export function JsonViewer({ data, collapsed = 2, name = false, className }: JsonViewerProps) {
  const [dark, setDark] = useState(isDocumentDark());

  useEffect(() => {
    const target = document.documentElement;
    const update = () => setDark(target.classList.contains("dark"));
    const observer = new MutationObserver(update);
    observer.observe(target, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  let parsed: unknown = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = { value: data };
    }
  }

  if (parsed === null || parsed === undefined) {
    return <div className={`text-sm text-muted-foreground ${className ?? ""}`}>No data</div>;
  }

  return (
    <div className={`rounded-md overflow-auto ${className ?? ""}`}>
      <ReactJson
        src={parsed as object}
        theme={dark ? "monokai" : "rjv-default"}
        collapsed={collapsed}
        name={name}
        displayDataTypes={false}
        displayObjectSize={false}
        enableClipboard
        style={{
          padding: "12px",
          fontSize: "12px",
          backgroundColor: "transparent",
          fontFamily: "ui-monospace, 'JetBrains Mono', Consolas, monospace",
        }}
      />
    </div>
  );
}
