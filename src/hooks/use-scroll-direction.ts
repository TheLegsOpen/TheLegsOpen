"use client";

import { useEffect, useState } from "react";

interface ScrollState {
  isScrolled: boolean;
  direction: "up" | "down";
}

export function useScrollDirection(threshold = 8): ScrollState {
  const [state, setState] = useState<ScrollState>({ isScrolled: false, direction: "up" });

  useEffect(() => {
    let lastY = window.scrollY;

    function handleScroll() {
      const currentY = window.scrollY;
      const direction = currentY > lastY ? "down" : "up";
      setState({ isScrolled: currentY > threshold, direction });
      lastY = currentY;
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return state;
}
