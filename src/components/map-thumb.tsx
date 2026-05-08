import { resolveAssetUrl } from "@/lib/asset-url";
import Image from "next/image";

export function mapPreviewSrc(imagePath: string | null | undefined): string {
  const raw =
    imagePath && imagePath.length > 0 ? imagePath : "/maps/placeholder.svg";
  return resolveAssetUrl(raw);
}

export function MapThumb({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const url = mapPreviewSrc(src);
  const unopt = url.endsWith(".svg");

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-stone-800">
      <Image
        src={url}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 360px"
        unoptimized={unopt}
      />
    </div>
  );
}
