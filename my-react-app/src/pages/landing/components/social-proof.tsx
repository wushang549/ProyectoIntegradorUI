import './social-proof.css'

const testimonials = [
  {
    quote:
      "Granulate makes data analysis effortless—I can upload a file, ask questions in plain English, and get instant insights without touching a formula.",
    author: 'Emma Clarke',
    company: 'DataVision Analytics',
    avatar: 'EC',
  },
  {
    quote:
      "Saves me hours every week by clustering customer feedback into clear themes. I can finally understand what customers really want.",
    author: 'Liam Foster',
    company: 'BrightPath Solutions',
    avatar: 'LF',
  },
  {
    quote:
      "The sentiment analysis feature helps me instantly understand customer feedback by classifying text as positive, negative, or neutral.",
    author: 'Sofia Bennett',
    company: 'NextWave Insights',
    avatar: 'SB',
  },
  {
    quote:
      "With Granulate, I no longer need to rely on analysts - I can explore and understand my own data instantly, all by myself.",
    author: 'Chloe Martinez',
    company: 'SparkPoint Consulting',
    avatar: 'CM',
  },
  {
    quote:
      "Creates polished data visualizations in seconds that would normally take me hours to build manually in Excel.",
    author: 'Noah Carter',
    company: 'SummitEdge Technologies',
    avatar: 'NC',
  },
  {
    quote:
      "The AI-powered clustering runs seamlessly, giving me all the insights I need without slowing down my workflow.",
    author: 'Ethan Hayes',
    company: 'CoreLogic Systems',
    avatar: 'EH',
  },
]

export function SocialProof() {
  return (
    <section className="social" id="social-proof">
      <div className="social__container">
        {/* Header */}
        <div className="social__header">
          <h2 className="social__title">
            Loved by teams at the
            <br />world's best companies
          </h2>
        </div>

        {/* Testimonials Marquee */}
        <div className="social__marquee">
          <div className="social__track">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className="social__card">
                <p className="social__quote">{t.quote}</p>
                <div className="social__author">
                  <div className="social__avatar">{t.avatar}</div>
                  <div>
                    <div className="social__name">{t.author}</div>
                    <div className="social__company">{t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
