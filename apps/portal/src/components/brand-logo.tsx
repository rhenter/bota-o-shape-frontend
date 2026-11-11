import Image from "next/image";

/** `dark` is the mark for navy surfaces. `light` keeps “Bota o” in blue. */
export function BrandLogo({
  priority = false,
  tone = "dark",
}: {
  priority?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <Image
      src={tone === "light" ? "/brand/logo-light.png" : "/brand/logo-dark.png"}
      alt="Bota o Shape!"
      width={1536}
      height={1024}
      className="brand-logo"
      priority={priority}
    />
  );
}
