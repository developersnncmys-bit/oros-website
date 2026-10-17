import Link from "next/link";
import { Tag } from "@phosphor-icons/react/ssr";

export default function AnnouncementBar() {
  return (
    <div className="bg-night text-white">
      <div className="mx-auto flex max-w-[1600px] items-center justify-center px-4 py-2.5 text-xs lg:px-8">
        <Link href="/bulk" className="group flex items-center gap-2.5">
          <Tag size={16} className="text-neon" weight="bold" />
          <span className="font-bold text-white group-hover:text-neon-2">
            Discounts on Bulk Orders —{" "}
            <span className="text-neon-2 underline-offset-2 group-hover:underline">
              get a quote
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
