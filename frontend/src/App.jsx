import { lazy, Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout.jsx";

const SalesDashboard = lazy(() => import("./pages/SalesDashboard.jsx"));
const MonitoringDashboard = lazy(
  () => import("./pages/MonitoringDashboard.jsx"),
);

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="animate-spin" size={17} />
          Loading workspace…
        </div>
      }
    >
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/sales" replace />} />
          <Route path="/sales" element={<SalesDashboard />} />
          <Route path="/monitoring" element={<MonitoringDashboard />} />
          <Route path="*" element={<Navigate to="/sales" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
