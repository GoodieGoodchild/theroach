/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — xneelo shared hosting is PHP/Apache, no Node runtime.
  // `next build` emits plain HTML into out/ which uploads to public_html.
  output: 'export',
  images: { unoptimized: true },
  // Apache serves /story as /story/index.html — without this, links 404 on xneelo.
  trailingSlash: true,
  reactStrictMode: true,
  // Pin the workspace root so a stray lockfile elsewhere can never confuse the build.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
