import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HealthCare+ Appointment API',
      version: '1.0.0',
      description: 'Healthcare Appointment & Follow-up Manager REST API',
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: 'Development' },
      { url: process.env.API_URL || 'https://api.healthcare.app', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Appointments', description: 'Appointment management' },
      { name: 'Doctors', description: 'Doctor management' },
      { name: 'Admin', description: 'Admin operations' },
      { name: 'AI', description: 'AI-powered features' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
