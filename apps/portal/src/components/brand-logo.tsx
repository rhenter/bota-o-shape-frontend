import Image from "next/image";

export function BrandLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/brand/logo-dark-header.png"
      alt="Bota o Shape!"
      width={240}
      height={96}
      className="brand-logo"
      priority={priority}
    />
  );
}
