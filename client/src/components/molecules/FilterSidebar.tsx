import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface FilterItem { name: string; count: number; }

interface Props {
  nationalities: FilterItem[];
  hobbies: FilterItem[];
  selectedNationalities: string[];
  selectedHobbies: string[];
  onToggleNationality: (name: string) => void;
  onToggleHobby: (name: string) => void;
}

function FilterList({ items, selected, prefix, onToggle }: {
  items: FilterItem[];
  selected: string[];
  prefix: string;
  onToggle: (name: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {items.map(({ name, count }) => (
        <li key={name} className="flex items-center gap-2">
          <Checkbox
            id={`${prefix}-${name}`}
            checked={selected.includes(name)}
            onCheckedChange={() => onToggle(name)}
          />
          <label
            htmlFor={`${prefix}-${name}`}
            onClick={(e) => e.preventDefault()}
            className="flex-1 min-w-0 text-sm text-foreground cursor-pointer truncate"
          >
            {name}
          </label>
          <span className="text-xs text-muted-foreground shrink-0">{count}</span>
        </li>
      ))}
    </ul>
  );
}

export default function FilterSidebar({ nationalities, hobbies, selectedNationalities, selectedHobbies, onToggleNationality, onToggleHobby }: Props) {
  return (
    <ScrollArea className="w-56 shrink-0 border-r bg-background">
      <div className="p-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Nationalities</p>
          <FilterList items={nationalities} selected={selectedNationalities} prefix="nat" onToggle={onToggleNationality} />
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Hobbies</p>
          <FilterList items={hobbies} selected={selectedHobbies} prefix="hob" onToggle={onToggleHobby} />
        </div>
      </div>
    </ScrollArea>
  );
}
