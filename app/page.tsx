import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import ProgressionSection from "@/components/landing/ProgressionSection";
import ChallengesSection from "@/components/landing/ChallengesSection";
import MentorSection from "@/components/landing/MentorSection";
import CareerSection from "@/components/landing/CareerSection";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <ProgressionSection />
      <ChallengesSection />
      <MentorSection />
      <CareerSection />
      <Footer />
    </>
  );
}
