import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'; // Esto carga tu DATABASE_URL desde el archivo .env

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
});