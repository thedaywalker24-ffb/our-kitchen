import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Our Kitchen",
    short_name: "Our Kitchen",
    description: "A private family recipe book.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6f3",
    theme_color: "#1f4937",
    orientation: "portrait-primary",
    categories: ["food", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
