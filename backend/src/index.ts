import app from './app';
import { config } from './config';
import prisma from './config/database';

const start = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`API docs: http://localhost:${config.port}/api/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
