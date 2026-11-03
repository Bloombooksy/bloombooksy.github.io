import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function Wstecz() {
  return (
    <Link to="/wiecej" className="-ml-1 flex w-fit items-center gap-1 text-[14px] font-semibold text-szary hover:text-atrament">
      <ChevronLeft className="size-4" /> Więcej
    </Link>
  );
}
