import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function Wstecz() {
  return (
    <Link to="/wiecej" className="-ml-1 -my-2 flex min-h-11 w-fit items-center gap-1 pr-3 text-[14px] font-semibold text-szary hover:text-atrament">
      <ChevronLeft className="size-4" /> Więcej
    </Link>
  );
}
