import type { AnalysisResults } from './types'

export const mockDataBalanced: AnalysisResults = {
  themes: [
    { name: 'Delivery', count: 12 },
    { name: 'Pricing', count: 7 },
    { name: 'Support', count: 4 },
    { name: 'App', count: 5 },
  ],
  clusters: [
    {
      title: 'Delivery Speed Issues',
      count: 8,
      keywords: ['late', 'slow', 'delayed', 'waiting'],
      examples: [
        'The delivery was 45 minutes late and the food was cold.',
        "I've been waiting for over an hour, this is unacceptable.",
      ],
    },
    {
      title: 'Positive Delivery Experience',
      count: 4,
      keywords: ['fast', 'quick', 'on time', 'early'],
      examples: ['Super fast delivery, arrived in just 20 minutes!', 'Always on time, love this service.'],
    },
    {
      title: 'Pricing Concerns',
      count: 7,
      keywords: ['expensive', 'overpriced', 'fees', 'cost'],
      examples: ['The delivery fees are getting out of hand.', 'Why did the prices go up so much?'],
    },
    {
      title: 'Customer Support Quality',
      count: 4,
      keywords: ['helpful', 'responsive', 'resolved', 'support'],
      examples: ['Support team was very helpful in resolving my issue.', 'Got a quick response when I had a problem with my order.'],
    },
  ],
}

export const mockDataDetailed: AnalysisResults = {
  themes: [
    { name: 'Late Delivery', count: 6 },
    { name: 'Cold Food', count: 4 },
    { name: 'Fast Delivery', count: 4 },
    { name: 'High Fees', count: 5 },
    { name: 'Price Increases', count: 3 },
    { name: 'Helpful Support', count: 3 },
    { name: 'App Bugs', count: 3 },
  ],
  clusters: [
    {
      title: 'Late Delivery Complaints',
      count: 6,
      keywords: ['late', 'delayed', 'waiting', 'hour'],
      examples: ['The delivery was 45 minutes late.', "I've been waiting for over an hour."],
    },
    {
      title: 'Food Temperature Issues',
      count: 4,
      keywords: ['cold', 'lukewarm', 'temperature'],
      examples: ['Food arrived completely cold.', 'My pizza was lukewarm at best.'],
    },
  ],
}
