import Image from "next/image";
import logo from "../../public/brand/logo-buntech-agro-trim.png";

export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return <Image src={logo} alt="Buntech Agro" className={className} priority={priority} />;
}
