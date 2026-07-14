import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminDoctorsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', specialization: '', consultationFee: 75,
  });

  const { data, refetch } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: async () => {
      const { data } = await api.get('/admin/doctors');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/doctors', form),
    onSuccess: () => { refetch(); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/doctors/${id}`),
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Doctors</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add Doctor</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            {Object.entries({ email: 'Email', password: 'Password', firstName: 'First Name', lastName: 'Last Name', specialization: 'Specialization' }).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input value={(form as Record<string, string | number>)[key] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="md:col-span-2">
              Create Doctor
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {data?.data?.map((doc: { id: string; firstName: string; lastName: string; specialization: string; user: { email: string } }) => (
          <Card key={doc.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">Dr. {doc.firstName} {doc.lastName}</p>
                <p className="text-sm text-muted-foreground">{doc.specialization} · {doc.user.email}</p>
              </div>
              <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(doc.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
