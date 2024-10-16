import { MainCarousel } from "@/components/home/main-carousel";
import { Markets } from "@/components/home/markets";

export default function Home() {
  return (
    <div className="container space-y-6">
      <MainCarousel />
      <Markets />
    </div>
  );
}
