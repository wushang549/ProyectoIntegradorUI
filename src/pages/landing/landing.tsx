import SiteHeader from '../../components/siteheader/siteheader'
import Hero from './components/hero'
import './landing.css'
import FAQ from './components/faq'
import { ExampleSection } from './components/example-section'
import HowItWorks from './components/how-it-works'
import { Features } from './components/features'

export default function Landing() {
  return (
    <div className="lp-page">
      <SiteHeader />
      <main className="lp-main">
        <Hero />
        <Features />
        <HowItWorks />
        <ExampleSection />
        <FAQ />
      </main>
    </div>
  )
}
