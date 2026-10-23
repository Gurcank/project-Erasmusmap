import LoadingRegion, {
  SkeletonBlock,
  SkeletonPanel,
} from "@/components/ui/PageSkeleton";

export default function TripsLoading() {
  return (
    <LoadingRegion className="mx-auto max-w-7xl px-4 pt-28 pb-24 sm:px-6 md:px-8">
      <div className="space-y-3">
        <SkeletonBlock className="h-9 w-56 max-w-full" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonPanel key={index} className="space-y-3">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-5 w-2/3" />
            <SkeletonBlock className="h-4 w-1/2" />
          </SkeletonPanel>
        ))}
      </div>
    </LoadingRegion>
  );
}
