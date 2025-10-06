import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

//Opções de ordenação:
export type SortOption = "name-asc" | "name-desc";

//Componente Barra de Pesquisa:
export function BoardSearchBar({ value, onChange, sort, onSortChange }: { value: string; onChange: (v: string) => void; sort: SortOption; onSortChange: (s: SortOption) => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
      <div className="grid gap-1">
        <Label htmlFor="search">Pesquisar</Label>
        <Input id="search" placeholder="Buscar por nome" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label>Organizar</Label>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
            <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
