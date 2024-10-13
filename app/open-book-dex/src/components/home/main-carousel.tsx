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
      className="container my-3 select-none"
    >
      <CarouselContent>
        <CarouselItem>
          <div className="p-1">
            <Card className="relative">
              <img
                src="/assets/images/banner-1.jpg"
                alt="Banner 1"
                className="w-full h-72 opacity-50"
              />
              <CardContent className="absolute inset-0 flex flex-col items-center justify-center p-6 h-72 gap-5">
                <span className="text-4xl font-semibold">
                  First Open Book DEX
                </span>
                <span className="text-2xl font-semibold">on</span>
                <span className="text-6xl font-medium text-red-600 tracking-widest">
                  SOON
                </span>
              </CardContent>
            </Card>
          </div>
        </CarouselItem>

        <CarouselItem>
          <div className="p-1">
            <Card className="relative">
              <img
                src="/assets/images/banner-2.jpg"
                alt="Banner 2"
                className="w-full h-72"
              />
              <CardContent className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-6 h-72 gap-5">
                <span className="text-4xl font-semibold">
                  Earn points on all order types!🌟
                </span>
                <span>Points system is not live yet</span>
              </CardContent>
            </Card>
          </div>
        </CarouselItem>

        <CarouselItem>
          <div className="p-1">
            <Card className="relative">
              <img
                src="/assets/images/banner-3.webp"
                alt="Banner 3"
                className="w-full h-72 object-cover opacity-80 rounded-xl"
              />
              <CardContent className="absolute inset-0 rounded-xl flex flex-col items-start justify-end p-6 h-72 gap-5 bg-gradient-to-tr from-black">
                <span className="text-4xl font-semibold">New Token: NEIRO</span>
                <span className="text-xl opacity-80">
                  The NEIRO/WETH market will be live soon.
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
