"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import * as React from "react";
import { Card, CardContent } from "../ui/card";

export function MainCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="container"
    >
      <CarouselContent>
        <CarouselItem>
          <div className="p-1">
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6 h-72 gap-5 bg-gradient-to-b from-red-900 to-70%">
                <span className="text-4xl font-semibold">
                  First Open Book DEX
                </span>
                <span className="text-xl font-semibold">on</span>
                <span className="text-5xl font-semibold text-red-700">
                  SOON
                </span>
              </CardContent>
            </Card>
          </div>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
