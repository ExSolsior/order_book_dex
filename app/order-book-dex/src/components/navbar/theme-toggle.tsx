"use client";

import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";

export function ThemeToggle() {
    const { setTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            className="h-8 w-8 px-0"
        >
            <SunIcon
                onClick={() => setTheme("dark")}
                className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
            />
            <MoonIcon
                onClick={() => setTheme("light")}
                className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
            />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
