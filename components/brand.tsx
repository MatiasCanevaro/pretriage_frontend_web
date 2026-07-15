import Image from "next/image";

export function Brand({ size = "default" }: { size?: "default" | "large" }) {
  return (
    <div className={`brand ${size === "large" ? "brand-large" : ""}`}>
      <Image
        alt=""
        className="brand-logo"
        height={216}
        priority={size === "large"}
        src="/pretriage-logo.png"
        width={216}
      />
      <span>PreTriage</span>
    </div>
  );
}
