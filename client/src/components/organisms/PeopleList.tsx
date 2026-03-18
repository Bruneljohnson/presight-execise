import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input";
import PersonCard from "@/components/molecules/PersonCard";
import { useFetch } from "@/hooks/useFetch";
import type { Person } from "@/types";

interface PeopleResponse {
  data: Person[];
  hasMore: boolean;
}

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  selectedHobbies: string[];
  selectedNationalities: string[];
}

export default function PeopleList({
  search,
  onSearchChange,
  selectedHobbies,
  selectedNationalities,
}: Props) {
  const [people, setPeople] = useState<Person[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [fading, setFading] = useState(false);

  const hobbiesKey = selectedHobbies.join(",");
  const nationalitiesKey = selectedNationalities.join(",");

  const parentRef = useRef<HTMLDivElement>(null);
  const { fetchCall, status } = useFetch();
  const loading = status === "loading";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setFading(true);
    const t = setTimeout(() => {
      setPeople([]);
      setPage(1);
      setHasMore(true);
      setFading(false);
    }, 150);
    return () => clearTimeout(t);
  }, [debouncedSearch, hobbiesKey, nationalitiesKey]);

  useEffect(() => {
    if (!hasMore) return;

    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (hobbiesKey) params.set("hobbies", hobbiesKey);
    if (nationalitiesKey) params.set("nationalities", nationalitiesKey);

    fetchCall<PeopleResponse>({
      key: `people-${page}-${debouncedSearch}-${hobbiesKey}-${nationalitiesKey}`,
      url: `/api/people?${params}`,
      onSuccess: (json) => {
        setPeople((prev) => (page === 1 ? json.data : [...prev, ...json.data]));
        setHasMore(json.hasMore);
      },
    });
  }, [page, debouncedSearch, hobbiesKey, nationalitiesKey, fetchCall]);

  const virtualizer = useVirtualizer({
    count: hasMore ? people.length + 1 : people.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  });

  const loadNextPage = useCallback(() => {
    if (!loading && hasMore) setPage((p) => p + 1);
  }, [loading, hasMore]);

  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (!items.length) return;
    const last = items[items.length - 1];
    if (last.index >= people.length - 1) loadNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [virtualizer.getVirtualItems(), loadNextPage]);

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="p-4 border-b bg-background">
        <Input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ opacity: fading ? 0 : 1, transition: "opacity 150ms ease" }}
      >
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((vItem) => {
            const person = people[vItem.index];
            return (
              <div
                key={vItem.key}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: vItem.start,
                  left: 0,
                  right: 0,
                  padding: "4px 0",
                }}
              >
                {person ? (
                  <PersonCard person={person} />
                ) : (
                  <div className="h-20 rounded-lg bg-muted animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
