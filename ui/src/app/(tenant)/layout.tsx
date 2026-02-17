import ProtectedRoute from "@/components/ProtectedRoute";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['TENANT']}>{children}</ProtectedRoute>;
}
