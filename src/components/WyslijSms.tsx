import { MessageSquareText } from "lucide-react";
import { smsHref } from "../lib/wiadomosci";

/** Przycisk, który otwiera SMS-y w telefonie Madzi z gotową treścią – ona tylko klika „Wyślij”. */
export function WyslijSms({ telefon, tresc, children, glowny, className = "" }: { telefon: string; tresc: string; children: React.ReactNode; glowny?: boolean; className?: string }) {
  return (
    <a href={smsHref(telefon, tresc)} className={`${glowny ? "btn-glowny" : "btn-jasny"} ${className}`}>
      <MessageSquareText className="size-4" /> {children}
    </a>
  );
}
