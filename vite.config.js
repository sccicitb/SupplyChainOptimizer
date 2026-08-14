import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Gagal terang-terangan bila 5173 terpakai. Tanpa ini Vite diam-diam
    // pindah ke port berikutnya — yang kebetulan 5174, milik server API —
    // lalu keduanya bertabrakan dan crash dengan ENOBUFS.
    strictPort: true,
    // Semua panggilan /api diteruskan ke server proxy. Browser tidak boleh
    // memanggil Nominatim/Overpass/OSRM langsung: CORS memblokirnya, dan
    // User-Agent berisi kontak yang diwajibkan Nominatim tidak dapat diset
    // dari sisi browser.
    proxy: {
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true
      }
    }
  }
});
