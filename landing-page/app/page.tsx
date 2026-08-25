import { Navbar } from "@/components/navbar/navbar"
import { HeroSection } from "@/components/hero/hero-section"
import { ProductSolution } from "@/components/product-solution/product-solution"
import { FeatureSection } from "@/components/features/feature-section"
import { TestimonialsSection } from "@/components/testimonials/testimonials-section"
import { CTASection } from "@/components/cta/cta-section"
import { Footer } from "@/components/footer/footer"

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      <ProductSolution />
      <FeatureSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  )
}
