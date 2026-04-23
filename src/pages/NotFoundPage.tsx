import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold text-muted-foreground">404</h1>
        <p className="text-sm text-muted-foreground">That route doesn't exist.</p>
      </div>
      <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
    </div>
  );
}
