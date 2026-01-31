import SiteHeader from '../../components/siteheader/siteheader'
import Hero from './components/hero'
import FAQ from './components/faq'

export default function Landing() {
  return (
    <div className="lp-page">
      <SiteHeader />
      <main className="lp-main">
        <Hero />
        <section id="how-it-works"></section>
        <FAQ />
      </main>
    </div>
  )
}
