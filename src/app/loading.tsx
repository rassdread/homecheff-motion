import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";

export default function RootLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <HomeCheffOrbitLoader state="route_transition" size="lg" />
    </div>
  );
}
