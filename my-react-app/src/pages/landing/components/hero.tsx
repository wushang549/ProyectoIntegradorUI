import './hero.css';
import heroPhoto from '../../../assets/herophoto.png';

type Props = {
  onTryFree?: () => void;
  onSeeHowItWorks?: () => void;
};

export default function Hero({ onTryFree, onSeeHowItWorks }: Props) {
  return (
    <section className="lp-hero" id="hero" aria-label="Granulate hero">
      <div className="lp-hero-inner">
        <div className="lp-hero-copy">
          <h1 className="lp-hero-title">Turn raw feedback into clear insights.</h1>

          <p className="lp-hero-subtitle">
            Granulate analyzes comments, reviews, and unstructured text to reveal patterns, trends, and
            signals you can act on.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-hero-cta" type="button" onClick={onTryFree}>
              Try it now — free
            </button>

            <button className="lp-hero-link" type="button" onClick={onSeeHowItWorks}>
              See how it works
            </button>
          </div>

          <div className="lp-hero-meta" aria-label="Highlights">
            <div className="lp-hero-pill">Auto clustering</div>
            <div className="lp-hero-pill">Theme summaries</div>
            <div className="lp-hero-pill">Sentiment + trends</div>
          </div>
        </div>

        <div className="lp-hero-preview" aria-label="Product preview">
          <img className="lp-hero-image" src={heroPhoto} alt="Product preview" />
        </div>
      </div>
    </section>
  );
}
