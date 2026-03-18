import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Person } from "@/types";

export default function PersonCard({ person }: { person: Person }) {
  const [firstHobby, secondHobby, ...remainingHobbies] = person.hobbies;

  return (
    <Card>
      <CardContent className="flex gap-3 py-3 px-4">
        <img
          src={person.avatar}
          alt={person.first_name}
          className="w-14 h-14 rounded-full shrink-0 bg-muted"
        />
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <span className="font-semibold truncate">
            {person.first_name} {person.last_name}
          </span>
          <div className="text-sm text-muted-foreground">
            <span>{person.nationality} · {person.age}</span>
          </div>
          <div className="flex gap-1 flex-wrap mt-1">
            {firstHobby && <Badge variant="secondary">{firstHobby}</Badge>}
            {secondHobby && <Badge variant="secondary">{secondHobby}</Badge>}
            {remainingHobbies.length > 0 && <Badge variant="outline">+{remainingHobbies.length}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
