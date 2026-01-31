import SiteHeader from '../../components/siteheader/siteheader'
import Hero from './components/hero'
import { SocialProof } from './components/social-proof'
import FAQ from './components/faq'
import HowItWorks from './components/how-it-works'

export default function Landing() {
  return (
    <div className="lp-page">
      <SiteHeader />
      <main className="lp-main">
        <Hero />
        <SocialProof />
        <HowItWorks />
        <section id="how-it-works"></section>
        <FAQ />
      </main>
    </div>
  )
}
