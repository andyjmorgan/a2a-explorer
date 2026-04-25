import { Routes, Route } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { LoginCallbackPage } from "@/pages/LoginCallbackPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AuthGuard } from "@/components/AuthGuard";
import { HomePage } from "@/pages/HomePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/callback" element={<LoginCallbackPage />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
