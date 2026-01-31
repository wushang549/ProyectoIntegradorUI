import SiteHeader from '../../components/siteheader/siteheader';
import Hero from './components/hero';

export default function Landing() {
  const goToLogin = () => {
    window.location.href = '/login';
  };

  const goToHow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp-page">
      <SiteHeader />
      <main className="lp-main">
        <Hero onTryFree={goToLogin} onSeeHowItWorks={goToHow} />
        <section id="how-it-works"></section>
      </main>
    </div>
  );
}
