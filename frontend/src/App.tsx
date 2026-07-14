import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminDoctorsPage from '@/pages/admin/AdminDoctorsPage';
import AdminPatientsPage from '@/pages/admin/AdminPatientsPage';
import DoctorDashboard from '@/pages/doctor/DoctorDashboard';
import PatientDashboard from '@/pages/patient/PatientDashboard';
import DoctorsListPage from '@/pages/patient/DoctorsListPage';
import DoctorProfilePage from '@/pages/patient/DoctorProfilePage';
import AppointmentsPage from '@/pages/patient/AppointmentsPage';
import { useAuthStore } from '@/stores/authStore';

function PortalWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />

      <Route path="/" element={
        isAuthenticated
          ? <Navigate to={user?.role === 'ADMIN' ? '/admin' : user?.role === 'DOCTOR' ? '/doctor' : '/patient'} />
          : <Navigate to="/login" />
      } />

      {/* Admin Portal */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><AdminDashboard /></PortalWrapper></ProtectedRoute>} />
      <Route path="/admin/doctors" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><AdminDoctorsPage /></PortalWrapper></ProtectedRoute>} />
      <Route path="/admin/patients" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><AdminPatientsPage /></PortalWrapper></ProtectedRoute>} />
      <Route path="/admin/appointments" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><AppointmentsPage /></PortalWrapper></ProtectedRoute>} />
      <Route path="/admin/leaves" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Leave Management</h1><p className="text-muted-foreground">Use API to manage doctor leaves</p></div></PortalWrapper></ProtectedRoute>} />
      <Route path="/admin/ai-logs" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">AI Logs</h1></div></PortalWrapper></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Failed Notifications</h1></div></PortalWrapper></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['ADMIN']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Audit Logs</h1></div></PortalWrapper></ProtectedRoute>} />

      {/* Doctor Portal */}
      <Route path="/doctor" element={<ProtectedRoute roles={['DOCTOR']}><PortalWrapper><DoctorDashboard /></PortalWrapper></ProtectedRoute>} />
      <Route path="/doctor/today" element={<ProtectedRoute roles={['DOCTOR']}><PortalWrapper><DoctorDashboard /></PortalWrapper></ProtectedRoute>} />
      <Route path="/doctor/appointments" element={<ProtectedRoute roles={['DOCTOR']}><PortalWrapper><AppointmentsPage /></PortalWrapper></ProtectedRoute>} />
      <Route path="/doctor/patients" element={<ProtectedRoute roles={['DOCTOR']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Patient List</h1></div></PortalWrapper></ProtectedRoute>} />
      <Route path="/doctor/calendar" element={<ProtectedRoute roles={['DOCTOR']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Calendar View</h1></div></PortalWrapper></ProtectedRoute>} />
      <Route path="/doctor/profile" element={<ProtectedRoute roles={['DOCTOR']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Profile Settings</h1></div></PortalWrapper></ProtectedRoute>} />

      {/* Patient Portal */}
      <Route path="/patient" element={<ProtectedRoute roles={['PATIENT']}><PortalWrapper><PatientDashboard /></PortalWrapper></ProtectedRoute>} />
      <Route path="/patient/doctors" element={<ProtectedRoute roles={['PATIENT']}><PortalWrapper><DoctorsListPage /></PortalWrapper></ProtectedRoute>} />
      <Route path="/patient/doctors/:id" element={<ProtectedRoute roles={['PATIENT']}><PortalWrapper><DoctorProfilePage /></PortalWrapper></ProtectedRoute>} />
      <Route path="/patient/appointments" element={<ProtectedRoute roles={['PATIENT']}><PortalWrapper><AppointmentsPage /></PortalWrapper></ProtectedRoute>} />
      <Route path="/patient/medications" element={<ProtectedRoute roles={['PATIENT']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Medication Reminders</h1></div></PortalWrapper></ProtectedRoute>} />
      <Route path="/patient/profile" element={<ProtectedRoute roles={['PATIENT']}><PortalWrapper><div className="p-6"><h1 className="text-2xl font-bold">Profile</h1></div></PortalWrapper></ProtectedRoute>} />

      <Route path="*" element={<div className="flex min-h-screen items-center justify-center"><h1 className="text-2xl font-bold">404 - Page Not Found</h1></div>} />
    </Routes>
  );
}
