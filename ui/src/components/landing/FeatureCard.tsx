'use client';

import { Card } from 'antd';
import type { Feature } from './constants';

interface FeatureCardProps {
  feature: Feature;
}

export default function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <Card
      className={`feature-card${feature.highlighted ? ' feature-card-highlighted' : ''}`}
      bordered={false}
    >
      <div
        className="feature-card-icon"
        style={{
          background: `${feature.color}15`,
          color: feature.color,
        }}
      >
        <Icon />
      </div>
      <div className="feature-card-title">{feature.title}</div>
      <div className="feature-card-desc">{feature.description}</div>
    </Card>
  );
}
