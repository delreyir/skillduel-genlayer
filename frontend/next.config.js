/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_CONTRACT_ADDRESS: "0xB95f58bcb95A7807FB462923c8aD23804C0C1608",
  },
};
module.exports = nextConfig;
