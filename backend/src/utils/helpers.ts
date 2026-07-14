export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const parsePagination = (query: {
  page?: string;
  limit?: string;
}): PaginationParams => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const parseSort = (
  sortBy?: string,
  sortOrder?: string,
  allowedFields: string[] = ['createdAt']
): Record<string, 'asc' | 'desc'> => {
  const field = sortBy && allowedFields.includes(sortBy) ? sortBy : allowedFields[0];
  const order = sortOrder === 'asc' ? 'asc' : 'desc';
  return { [field]: order };
};

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const addMinutesToTime = (time: string, minutes: number): string => {
  return minutesToTime(timeToMinutes(time) + minutes);
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
