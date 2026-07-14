import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Stethoscope, Activity, DollarSign, Brain, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';
import { StatCard, LoadingSkeleton, StatusBadge } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '@/types';
import { formatDate } from '@/lib/utils';

const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data } = await api.get<{ data: DashboardStats }>('/admin/dashboard');
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const chartData = data?.popularSpecializations?.map((s) => ({
    name: s.specialization,
    count: s._count.specialization,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today" value={data?.appointmentsToday || 0} icon={Calendar} />
        <StatCard title="This Week" value={data?.weeklyAppointments || 0} icon={Activity} />
        <StatCard title="Patients" value={data?.totalPatients || 0} icon={Users} />
        <StatCard title="Doctors" value={data?.totalDoctors || 0} icon={Stethoscope} />
        <StatCard title="Completed" value={data?.completed || 0} icon={Activity} trend="This week" />
        <StatCard title="Cancelled" value={data?.cancelled || 0} icon={AlertTriangle} />
        <StatCard title="AI Usage" value={data?.aiUsage || 0} icon={Brain} trend="This week" />
        <StatCard title="Revenue" value={`$${data?.revenuePlaceholder || 0}`} icon={DollarSign} trend="Placeholder" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Popular Specializations</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Specialization Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.recentBookings?.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">
                    {apt.patient?.firstName} {apt.patient?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dr. {apt.doctor?.firstName} {apt.doctor?.lastName} · {apt.doctor?.specialization}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={apt.status} />
                  <p className="mt-1 text-sm text-muted-foreground">{formatDate(apt.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
