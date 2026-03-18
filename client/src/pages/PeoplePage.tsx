import { useEffect, useState } from "react";
import FilterSidebar from "@/components/molecules/FilterSidebar";
import PeopleList from "@/components/organisms/PeopleList";
import { useFetch } from "@/hooks/useFetch";

interface Meta {
  topHobbies: { name: string; count: number }[];
  topNationalities: { name: string; count: number }[];
}

export default function PeoplePage() {
  const [search, setSearch] = useState("");
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [meta, setMeta] = useState<Meta>({ topHobbies: [], topNationalities: [] });
  const { fetchCall } = useFetch();

  useEffect(() => {
    fetchCall<Meta>({
      key: "people-meta",
      url: "/api/people/meta",
      cacheKey: "people-meta",
      onSuccess: setMeta,
    });
  }, [fetchCall]);

  function toggle(item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  }

  return (
    <div className="flex h-[calc(100vh-44px)]">
      <FilterSidebar
        nationalities={meta.topNationalities}
        hobbies={meta.topHobbies}
        selectedNationalities={selectedNationalities}
        selectedHobbies={selectedHobbies}
        onToggleNationality={(name) => toggle(name, setSelectedNationalities)}
        onToggleHobby={(name) => toggle(name, setSelectedHobbies)}
      />
      <PeopleList
        search={search}
        onSearchChange={setSearch}
        selectedHobbies={selectedHobbies}
        selectedNationalities={selectedNationalities}
      />
    </div>
  );
}
