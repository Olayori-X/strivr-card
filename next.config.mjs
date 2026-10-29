/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully frontend: `next build` writes a static site to ./out
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};
export default nextConfig;
