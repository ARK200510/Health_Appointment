import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth';

export const auditLog = (action: string, entity: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode < 400) {
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.userId,
              action,
              entity,
              entityId: (body as { data?: { id?: string } })?.data?.id,
              newData: body as object,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            },
          })
          .catch(console.error);
      }
      return originalJson(body);
    };
    next();
  };
};

export const getAuditMiddleware = () => {
  return async (req: Request, _res: Response, next: NextFunction) => {
  next();
  };
};
