import { useState } from 'react'
import './faq.css'

const faqs = [
  {
    question: 'Is there an AI that can analyze my data?',
    answer:
      'Yes! Granulate is an AI-powered data analyst that processes, interprets, and extracts insights from your data through natural language. Simply upload your data and ask questions in plain English to get charts, themes, sentiment analysis, and more.',
  },
  {
    question: 'How accurate is sentiment analysis?',
    answer:
      'Our AI achieves 92% accuracy on industry benchmarks. We use context-aware models trained specifically on customer feedback data, which means we understand nuances like sarcasm and mixed sentiment.',
  },
  {
    question: 'Can I filter by location or date?',
    answer:
      'Yes, all plans include filtering by date range. Team and Business plans add location, channel, rating, and custom tag filters. You can also create saved filter presets.',
  },
  {
    question: 'Do you store my data?',
    answer:
      'Your data is stored securely in SOC 2 compliant infrastructure. We use encryption at rest and in transit. You can delete your data at any time, and we never share or sell your data to third parties.',
  },
  {
    question: 'Can I export reports?',
    answer:
      'Yes, Team and Business plans include PDF and CSV exports. You can also share read-only dashboard links with teammates or stakeholders without giving them full account access.',
  },
  {
    question: 'Do you support SSO?',
    answer:
      'SSO (SAML 2.0) is available on Business plans. We support Okta, Azure AD, Google Workspace, and other major identity providers. Contact sales for setup assistance.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="faq-section">
      <div className="faq-container">
        <div className="faq-header">
          <span className="section-label">// FAQ //</span>
          <h2 className="faq-title">Your questions, answered</h2>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => {
            const open = openIndex === index

            return (
              <div key={index} className={`faq-item ${open ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() =>
                    setOpenIndex(open ? null : index)
                  }
                  aria-expanded={open}
                >
                  <span>{faq.question}</span>
                  <span className="faq-icon">{open ? '−' : '+'}</span>
                </button>

                {open && (
                  <div className="faq-answer">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
