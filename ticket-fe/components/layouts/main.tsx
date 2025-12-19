"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

type MainLayoutProps = {
  children: React.ReactNode;
};
const queryClient = new QueryClient();

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
}: MainLayoutProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen w-full lg:max-w-[1440px] lg:mx-auto mx-4 p-4">
        {children}
      </div>
    </QueryClientProvider>
  );
};

export default MainLayout;
