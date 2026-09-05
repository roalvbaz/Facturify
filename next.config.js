/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['172.21.1.220'], // Añadido para permitir el acceso por red local
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://www.gstatic.com/recaptcha/; img-src 'self' data: https: blob:; font-src 'self' data: https://cdnjs.cloudflare.com; connect-src 'self' https://*.supabase.co https://*.google.com; frame-src 'self' https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/;",
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig;