import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Users } from 'lucide-react';
import api from '@/lib/api';
import { StatCard, StatusBadge, EmptyState } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTime } from '@/lib/utils';
import type { Appointment } from '@/types';

export default function DoctorDashboard() {
  const { data: todayAppts } = useQuery({
    queryKey: ['doctor-today'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Appointment[] }>('/appointments/today');
      return data.data;
    },
  });

  const { data: allAppts } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Appointment[] }>('/appointments?limit=50');
      return data.data;
    },
  });

  const upcoming = allAppts?.filter((a) => ['CONFIRMED', 'PENDING'].includes(a.status)) || [];
  const completed = allAppts?.filter((a) => a.status === 'COMPLETED').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Your practice at a glance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Today's Appointments" value={todayAppts?.length || 0} icon={Calendar} />
        <StatCard title="Upcoming" value={upcoming.length} icon={Clock} />
        <StatCard title="Completed" value={completed} icon={Users} />
      </div>

      <Card>
        <CardHeader><CardTitle>Today's Schedule</CardTitle></CardHeader>
        <CardContent>
          {!todayAppts?.length ? (
            <EmptyState title="No appointments today" description="Enjoy your free day!" icon={Calendar} />
          ) : (
            <div className="space-y-3">
              {todayAppts.map((apt) => (
                <div key={apt.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                    <Clock className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{apt.patient?.firstName} {apt.patient?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(apt.startTime)} - {formatTime(apt.endTime)}</p>
                    {apt.aiSummaries?.[0] && (
                      <p className="mt-1 text-xs text-amber-600">
                        AI: {apt.aiSummaries[0].urgencyLevel} urgency · {apt.aiSummaries[0].chiefComplaint}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
