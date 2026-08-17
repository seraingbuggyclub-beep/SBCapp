import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seraing Buggy Club",
    short_name: "SBC App",
    description: "Système de présence et d'accès piste pour le Seraing Buggy Club (ASBL FBA)",
    start_url: "/",
    display: "standalone",
    background_color: "#131313",
    theme_color: "#ff6e00",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
