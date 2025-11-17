"use client";
import { memo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import LandingPage from "@/components/LandingPage"
import MintUSDC from "@/components/MintUSDC"
import TestPage from "@/components/TestPage"
import { DevProvider } from "@/contexts/DevContext"
import { DevPanel } from "@/components/ui/DevPanel"
import { Toaster } from "@/components/ui/sonner"

// Protected Route Component (currently unused)
// const ProtectedRoute = memo(function ProtectedRoute({ children }: { children: React.ReactNode }) {
//   const { isAuthenticated } = useAuth();
//   return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
// });

// Main App Content Component
const AppContent = memo(function AppContent() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/mint-usdc" element={<MintUSDC />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DevPanel />
      </Router>
      <Toaster />
    </>
  );
});

// Main App Component with Auth Provider
const App = memo(function App() {
  return (
    <DevProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DevProvider>
  );
});

export { App };

export default App;