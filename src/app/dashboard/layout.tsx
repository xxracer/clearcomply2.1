
'use client';

import type { PropsWithChildren } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { getNewCandidates } from "../actions/candidate-actions";
import { Toaster } from "@/components/ui/toaster";


// Base64 encoded audio for the notification sound
const notificationSound = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//tAmAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIwARSEsAAAAAAAAAAAAAAB9VSVNERVJAAAAAQ09NUFJFU1NPUkRFRkFUVAAAAkNPTU1FUkNJQUxERUZBVVQAAABDVUNPREVGREVBVFRVAAAARUNPUllHSFRERUZBVVQAAABDT01NRU5UREVGQVNUAAAAAExhbWUAAAARAAAAmR8AnwwDyESg/9Mv6ANLf//3RLEHlssmS5hEArs4bBDzP8rcfB3gYJADqcBwQZD//pYYN/y29yp0aA0BwEb4I8//pW8P/u6v/g5f/sU+r/A0BwD//pYwV/y43/N0Gf/z1P/5/QEAAAAVVlBFAAAAAAAAP/7A4wAAAAAAAAAAAEAAAEBAQAEBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHx9/A4ADgAwADgA6AA+AOMA0gAAAAAAAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AAAsQACgAPADABEAAREBAhEB/8QAaQABAQEBAQEBAQAAAAAAAAAAAAgGBQQHAgMB/9oACAEBAAAAAL4gDwoPz45z4j2Y5YVfM+j34T78t3N/n+P76e3n7572dnmPDk1tO7gAB//9k=";


export default function DashboardLayout({ children }: PropsWithChildren) {
  const [initialCandidateCount, setInitialCandidateCount] = useState<number | null>(null);

  const checkNewCandidates = useCallback(async () => {
    try {
      const newCandidates = await getNewCandidates();
      
      if (initialCandidateCount === null) {
        setInitialCandidateCount(newCandidates.length);
        return;
      }
      
      if (newCandidates.length > initialCandidateCount) {
        const audio = new Audio(notificationSound);
        audio.play().catch(e => console.error("Failed to play notification sound:", e));
      }
      
      setInitialCandidateCount(newCandidates.length);

    } catch (error) {
      console.error("Error checking for new candidates:", error);
    }
  }, [initialCandidateCount]);

  useEffect(() => {
    // Check for new candidates when the component mounts
    checkNewCandidates();

    // Set up a listener for storage events to detect changes from other tabs
    window.addEventListener('storage', checkNewCandidates);

    // Also poll periodically as a fallback
    const intervalId = setInterval(checkNewCandidates, 15000); // Check every 15 seconds

    // Clean up listeners on component unmount
    return () => {
      window.removeEventListener('storage', checkNewCandidates);
      clearInterval(intervalId);
    };
  }, [checkNewCandidates]);

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
