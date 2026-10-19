import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n-context";

export type SortOption = "name-asc" | "name-desc";

export function BoardSearchBar({ 
  value, 
  onChange, 
  sort, 
  onSortChange 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  sort: SortOption; 
  onSortChange: (s: SortOption) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
      <div className="grid gap-1 flex-1">
        <Label htmlFor="search">{t("boards_search_label")}</Label>
        <Input 
          id="search" 
          placeholder={t("boards_search_placeholder")} 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
        />
      </div>
      <div className="grid gap-1">
        <Label>{t("boards_sort_label")}</Label>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder={t("boards_sort_placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">{t("boards_sort_az")}</SelectItem>
            <SelectItem value="name-desc">{t("boards_sort_za")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}