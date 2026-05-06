import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
};

module.exports = {
  allowedDevOrigins: ['dev-pantry.nonano.dev'],
}

export default withPWA({
  dest: "public",
  register: true,
  disable: true,
})(nextConfig);
