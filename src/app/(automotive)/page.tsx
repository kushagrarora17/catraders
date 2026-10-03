import type { Metadata } from "next";
import { BrandGrid } from "@/features/landing/components/BrandGrid";
import { Contact } from "@/features/landing/components/Contact";
import { Hero } from "@/features/landing/components/Hero";
import { StructuredData } from "@/features/landing/components/StructuredData";
import { Testimonials } from "@/features/landing/components/Testimonials";
import { WhyUs } from "@/features/landing/components/WhyUs";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <Hero />
      <WhyUs />
      <BrandGrid />
      <Testimonials />
      <Contact />
    </>
  );
}
