"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cards/");
  }, [router]);
  return (
    <p style={{ padding: 24 }}>
      <Link href="/cards/">Open Strivr Card Folder</Link>
    </p>
  );
}
