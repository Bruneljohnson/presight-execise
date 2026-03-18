import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface Job {
  requestId: string;
  status: "pending" | "done";
  result?: string;
}

export default function JobCard({ job, index }: { job: Job; index: number }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Job {index + 1}</span>
          {job.status === "pending" ? (
            <Badge variant="secondary" className="animate-pulse">pending</Badge>
          ) : (
            <Badge className="bg-green-600 text-white">done</Badge>
          )}
        </div>
        {job.result && (
          <p className="text-sm text-muted-foreground">{job.result}</p>
        )}
      </CardContent>
    </Card>
  );
}
