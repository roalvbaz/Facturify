import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.21.1.220'], // Añadido para permitir el acceso por red local
};

export default nextConfig;