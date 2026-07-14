import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Calendar, Stethoscope, Star } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/stat-card';
import type { Doctor, Appointment } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

export default function PatientDashboard() {
  const [search, setSearch] = useState('');

  const { data: appointments } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Appointment[] }>('/appointments?limit=5');
      return data.data;
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-search', search],
    queryFn: async () => {
      const { data } = await api.get<{ data: Doctor[] }>(`/doctors/search?search=${search}&limit=3`);
      return data.data;
    },
    enabled: search.length > 0,
  });

  const upcoming = appointments?.filter((a) => ['CONFIRMED', 'PENDING'].includes(a.status)) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Manage your health appointments</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search doctors by name or specialization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && doctors && (
          <Card className="absolute z-10 mt-1 w-full">
            <CardContent className="p-2">
              {doctors.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No doctors found</p>
              ) : (
                doctors.map((doc) => (
                  <Link key={doc.id} to={`/patient/doctors/${doc.id}`} className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                      <Stethoscope className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium">Dr. {doc.firstName} {doc.lastName}</p>
                      <p className="text-sm text-muted-foreground">{doc.specialization}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {doc.rating.toFixed(1)}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-4">
        <Link to="/patient/doctors">
          <Button><Stethoscope className="mr-2 h-4 w-4" /> Find Doctors</Button>
        </Link>
        <Link to="/patient/appointments">
          <Button variant="outline"><Calendar className="mr-2 h-4 w-4" /> My Appointments</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Upcoming Appointments</h2>
          {!upcoming.length ? (
            <EmptyState title="No upcoming appointments" description="Book an appointment with a doctor" icon={Calendar} />
          ) : (
            <div className="space-y-3">
              {upcoming.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Dr. {apt.doctor?.firstName} {apt.doctor?.lastName}</p>
                    <p className="text-sm text-muted-foreground">{apt.doctor?.specialization}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(apt.date)}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(apt.startTime)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
