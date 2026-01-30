import SiteHeader from '../../components/siteheader/siteheader'
import './landing.css'

export default function Landing() {
  return (
    <div className="gh-page">
      <SiteHeader />
      <main className="gh-main">
        <section id="features"></section>
      </main>
    </div>
  )
}
