import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Star, Stethoscope } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/stat-card';
import type { Doctor } from '@/types';

const SPECIALIZATIONS = ['General Medicine', 'Cardiology', 'Dermatology', 'Orthopedics', 'Pediatrics'];

export default function DoctorsListPage() {
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', search, specialization],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (search) params.set('search', search);
      if (specialization) params.set('specialization', specialization);
      const { data } = await api.get<{ data: Doctor[] }>(`/doctors/search?${params}`);
      return data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Find Doctors</h1>
        <p className="text-muted-foreground">Search by name or specialization</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
        >
          <option value="">All Specializations</option>
          {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !doctors?.length ? (
        <EmptyState title="No doctors found" description="Try adjusting your search filters" icon={Stethoscope} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doc) => (
            <Link key={doc.id} to={`/patient/doctors/${doc.id}`}>
              <Card className="h-full transition-all hover:shadow-lg hover:border-teal-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/30">
                      <Stethoscope className="h-7 w-7 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Dr. {doc.firstName} {doc.lastName}</h3>
                      <p className="text-sm text-teal-600">{doc.specialization}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span>{doc.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({doc.totalReviews} reviews)</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{doc.experience} years experience</p>
                      <p className="mt-2 font-medium text-teal-700">${doc.consultationFee}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
