import LoadingRegion, {
  SkeletonBlock,
  SkeletonPanel,
} from "@/components/ui/PageSkeleton";

export default function SquareLoading() {
  return (
    <div className="min-h-screen pt-24">
      <LoadingRegion className="mx-auto max-w-5xl space-y-12 px-6 pb-20">
        <div className="space-y-3">
          <SkeletonBlock className="h-9 w-56 max-w-full" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock key={index} className="h-40" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonPanel key={index} className="space-y-3">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-4 w-full" />
            </SkeletonPanel>
          ))}
        </div>
      </LoadingRegion>
    </div>
  );
}
