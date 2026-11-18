import Image, { type ImageProps } from "next/image";
import { isPlaceholderUrl } from "@/lib/placeholder";
import { cn } from "@/lib/utils";

const OPTIMIZED_HOSTS = [/(^|\.)res\.cloudinary\.com$/, /\.amazonaws\.com$/, /\.r2\.dev$/, /\.cloudfront\.net$/];

/** next/image wrapper: optimizes known hosts, passes SVG placeholders / unknown hosts through. */
export function VehicleImage({ src, alt, className, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  let unoptimized = isPlaceholderUrl(src) || src.endsWith(".svg");
  if (!unoptimized && /^https?:\/\//.test(src)) {
    try {
      const host = new URL(src).hostname;
      const configured = process.env.NEXT_PUBLIC_IMAGE_HOSTS?.split(",").map((h) => h.trim()) ?? [];
      unoptimized = !OPTIMIZED_HOSTS.some((re) => re.test(host)) && !configured.includes(host);
    } catch {
      unoptimized = true;
    }
  }
  return <Image src={src} alt={alt} unoptimized={unoptimized} className={cn("object-cover", className)} {...props} />;
}
