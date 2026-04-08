import './example-section.css'

export function ExampleSection() {
  return (
    <section id="example" className="ex-section">
      <div className="ex-container">
        <div className="ex-header">
          <h2 className="ex-title">See it in action</h2>
          <p className="ex-subtitle">
            A real example of analyzing social media discussions with Hashtree.
          </p>
        </div>

        <div className="ex-grid">
          {/* Left */}
          <div>
            <h3 className="ex-left-title">
              Example: Reddit discussion analysis
            </h3>

            <ul className="ex-list">
              <li className="ex-item">
                <span className="ex-dot muted" />
                <span>
                  <strong>Dataset:</strong> 1,200 Reddit comments from a single discussion thread
                </span>
              </li>

              <li className="ex-item">
                <span className="ex-dot red" />
                <span>
                  <strong>Detected issue:</strong> Negative sentiment related to delivery delays
                </span>
              </li>

              <li className="ex-item">
                <span className="ex-dot amber" />
                <span>
                  <strong>Emerging topic:</strong> “missing items in online orders”
                </span>
              </li>

              <li className="ex-item">
                <span className="ex-dot primary" />
                <span>
                  <strong>Frequent keywords:</strong> delay, refund, support, order, wait
                </span>
              </li>
            </ul>

            <div className="ex-callout">
              <div className="ex-callout-head">
                <span className="ex-callout-icon">💡</span>
                <span className="ex-callout-label">Automated insight</span>
              </div>

              <p className="ex-callout-text">
                Delivery-related complaints form a distinct cluster with consistently negative sentiment.
                Consider investigating fulfillment workflows during high-traffic periods.
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="ex-card">
            <div className="ex-block">
              <h4 className="ex-block-title">Sentiment breakdown</h4>

              <div className="ex-progress">
                <div className="ex-progress-head">
                  <span>Delivery speed</span>
                  <span className="red-text">Negative trend</span>
                </div>
                <div className="ex-bar">
                  <div className="ex-bar-fill red" style={{ width: '35%' }} />
                </div>
              </div>

              <div className="ex-progress">
                <div className="ex-progress-head">
                  <span>Product quality</span>
                  <span className="green-text">Mostly positive</span>
                </div>
                <div className="ex-bar">
                  <div className="ex-bar-fill green" style={{ width: '72%' }} />
                </div>
              </div>
            </div>

            <div className="ex-block">
              <h4 className="ex-block-title">Emerging topics</h4>
              <ul className="ex-mini-list">
                <li><span className="ex-dot red" />Missing items in orders</li>
                <li><span className="ex-dot amber" />Long wait times during peak hours</li>
                <li><span className="ex-dot amber" />Customer support response delays</li>
              </ul>
            </div>

            <div className="ex-block">
              <h4 className="ex-block-title">Top keywords</h4>
              <div className="ex-tags">
                <span>delay</span>
                <span>refund</span>
                <span>wait</span>
                <span>support</span>
                <span>order</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
