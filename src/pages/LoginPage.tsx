import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import donkeyworkLogo from "/donkeywork.png";

export function LoginPage() {
  const handleLogin = () => {
    window.location.assign("/api/v1/auth/login");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-cyan-500/5">
        <CardContent className="pt-8 pb-8 px-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={donkeyworkLogo} alt="DonkeyWork" className="w-16 h-16 mx-auto mb-3" />
            <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              A2A Explorer
            </h1>
            <p className="text-sm text-muted-foreground">
              Save your agents, test them anywhere.
            </p>
          </div>

          <Button
            onClick={handleLogin}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/25 text-white transition-all duration-200"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with Keycloak
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
