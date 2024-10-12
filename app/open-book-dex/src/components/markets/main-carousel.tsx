"use client"

import * as React from "react"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { cn } from "@/lib/utils"

const MainCarousel = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className }, ref) => {
    const plugin = React.useRef(
        Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })
    );

    return <Carousel className={cn("w-full", className)}
        plugins={[plugin.current]}
        ref={ref}
    >
        <CarouselContent>
            <MainCarouselItem1 />
            {/* <CarouselItem>2</CarouselItem>
            <CarouselItem>3</CarouselItem> */}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
    </Carousel>
});
MainCarousel.displayName = "MainCarousel"

const MainCarouselItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    const classes = ""

    return <CarouselItem ref={ref} className={cn(classes, className)} {...props} />
})
MainCarouselItem.displayName = "MainCarouselItem"

const MainCarouselItem1 = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className }, ref) => {
    return <MainCarouselItem ref={ref} className={`${cn(className)}`}>
        <h2 className="text-4xl font-bold mb-4 text-center">First Open Book DEX</h2>
        <h2 className="text-3xl font-bold mb-4 text-center">on</h2>
        <h2 className="text-4xl font-bold mb-4 text-center text-red-700">SOON</h2>
    </MainCarouselItem>
})
MainCarouselItem1.displayName = "MainCarouselItem1"

export { MainCarousel }
