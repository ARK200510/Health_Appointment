import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, Clock, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Doctor, TimeSlot } from '@/types';
import { formatTime } from '@/lib/utils';

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [holdId, setHoldId] = useState('');

  const { data: doctor } = useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Doctor }>(`/doctors/${id}`);
      return data.data;
    },
  });

  const { data: slots } = useQuery({
    queryKey: ['slots', id, selectedDate],
    queryFn: async () => {
      const { data } = await api.get<{ data: TimeSlot[] }>(`/appointments/slots?doctorId=${id}&date=${selectedDate}`);
      return data.data;
    },
    enabled: !!selectedDate,
  });

  const holdMutation = useMutation({
    mutationFn: async (slot: TimeSlot) => {
      const { data } = await api.post('/appointments/hold', {
        doctorId: id,
        date: selectedDate,
        startTime: slot.startTime,
      });
      return data.data;
    },
    onSuccess: (hold) => {
      setHoldId(hold.id);
      setSelectedSlot(slots?.find((s) => s.startTime === hold.startTime) || null);
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/appointments/book', {
        holdId,
        reason: 'Consultation',
        symptoms: symptoms ? { description: symptoms, severity: 'moderate' } : undefined,
      });
      return data.data;
    },
    onSuccess: () => navigate('/patient/appointments'),
  });

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {doctor && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-teal-100">
                <span className="text-3xl font-bold text-teal-600">
                  {doctor.firstName[0]}{doctor.lastName[0]}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Dr. {doctor.firstName} {doctor.lastName}</h1>
                <p className="text-teal-600">{doctor.specialization}</p>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{doctor.rating.toFixed(1)}</span>
                  <span>{doctor.experience} years</span>
                  <span className="font-medium">${doctor.consultationFee}</span>
                </div>
                {doctor.bio && <p className="mt-3 text-muted-foreground">{doctor.bio}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Book Appointment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Input type="date" min={minDate} value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); setHoldId(''); }} />
          </div>

          {selectedDate && (
            <div className="space-y-2">
              <Label>Available Slots</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {slots?.map((slot) => (
                  <Button
                    key={slot.startTime}
                    variant={selectedSlot?.startTime === slot.startTime ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => holdMutation.mutate(slot)}
                    disabled={holdMutation.isPending}
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    {formatTime(slot.startTime)}
                  </Button>
                ))}
                {slots?.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No slots available</p>}
              </div>
            </div>
          )}

          {holdId && (
            <>
              <div className="space-y-2">
                <Label>Symptoms (optional)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Describe your symptoms for AI pre-visit analysis..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
              <Button onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending} className="w-full">
                {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Slot held for 10 minutes</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
