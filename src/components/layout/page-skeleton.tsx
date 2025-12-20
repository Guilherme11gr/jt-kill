import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
                <Skeleton className="h-8 w-48 md:w-64 mb-2" />
                <Skeleton className="h-4 w-64 md:w-96" />
            </div>
            {withAction && (
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 md:w-28" />
                </div>
            )}
        </div>
    );
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card text-card-foreground shadow space-y-4 p-6 h-[200px]">
                    <div className="flex justify-between items-start">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            ))}
        </div>
    );
}

export function SingleColumnSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
        </div>
    )
}
