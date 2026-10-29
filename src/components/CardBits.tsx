"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/format";
import type { CardItem } from "@/features/cards/CardsProvider";
import { FOLDER_NAME } from "@/infrastructure/storage/card-store";

export function cardHref(id: string): string {
  return `/cards/card/?id=${encodeURIComponent(id)}`;
}

export function CardRow({ card }: { card: CardItem }) {
  return (
    <Link href={cardHref(card.id)} className="row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.url} alt="" />
      <div className="grow">
        <strong>{card.name}</strong>
        <span className="sub">{card.fileName}</span>
      </div>
      <span className="when">{timeAgo(card.savedAt)}</span>
    </Link>
  );
}

export function CardTile({ card }: { card: CardItem }) {
  return (
    <Link href={cardHref(card.id)} className="tile">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.url} alt={`Business card of ${card.name}`} />
      <strong>{card.name}</strong>
      <span>{card.fileName}</span>
    </Link>
  );
}

export const FOLDER = FOLDER_NAME;
