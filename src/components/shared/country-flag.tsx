import { countryFlag, countryName } from "@/data/countries";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  code: string;
  className?: string;
}

export function CountryFlag({ code, className }: CountryFlagProps) {
  const flag = countryFlag(code);
  if (!flag) return null;
  return <span className={cn("fi", `fi-${flag}`, "inline-block rounded-[2px]", className)} title={countryName(code)} />;
}
