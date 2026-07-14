import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, EmptyState } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import type { Appointment } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

export default function AppointmentsPage() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Appointment[] }>('/appointments?limit=50');
      return data.data;
    },
  });

  const handleCancel = async (id: string) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    await api.post(`/appointments/${id}/cancel`, { reason });
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Appointments</h1>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : !appointments?.length ? (
        <EmptyState title="No appointments" description="Book your first appointment" icon={Calendar} />
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Card key={apt.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {apt.doctor ? `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}` : `${apt.patient?.firstName} ${apt.patient?.lastName}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {apt.doctor?.specialization || apt.patient?.phone}
                  </p>
                  <p className="mt-1 text-sm">{formatDate(apt.date)} · {formatTime(apt.startTime)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={apt.status} />
                  {['CONFIRMED', 'PENDING'].includes(apt.status) && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(apt.id)}>Cancel</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
