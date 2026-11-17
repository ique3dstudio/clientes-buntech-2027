import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Buntech Agro · Mapa de Clientes",
    short_name: "Buntech Clientes",
    description: "App oficial de prospecção de clientes Buntech Agro 2027",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0891d1",
    lang: "pt-BR",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
