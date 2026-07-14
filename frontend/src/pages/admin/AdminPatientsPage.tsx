import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminPatientsPage() {
  const { data } = useQuery({
    queryKey: ['admin-patients'],
    queryFn: async () => {
      const { data } = await api.get('/admin/patients');
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manage Patients</h1>
      <div className="space-y-3">
        {data?.data?.map((p: { id: string; firstName: string; lastName: string; phone?: string; user: { email: string; createdAt: string } }) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{p.firstName} {p.lastName}</p>
                <p className="text-sm text-muted-foreground">{p.user.email} · {p.phone}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Joined {new Date(p.user.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
