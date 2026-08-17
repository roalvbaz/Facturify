import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL en el archivo .env");
}

// Initialize Drizzle with connection string
export const db = drizzle(connectionString);