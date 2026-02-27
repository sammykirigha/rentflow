'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Col, Row, Collapse } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MobileOutlined,
  SwapRightOutlined,
  WalletOutlined,
  FileProtectOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';
import FeatureCard from './FeatureCard';
import DemoRequestModal from './DemoRequestModal';
import {
  features,
  steps,
  stats,
  tenantFeatures,
  painPoints,
  flowSteps,
  comparisonRows,
  pricingPlans,
  testimonials,
  faqItems,
  trustBadges,
} from './constants';
import './landing.css';

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeFlowStep, setActiveFlowStep] = useState(0);

  const openDemo = useCallback(() => setDemoOpen(true), []);

  // Cycle through flow steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFlowStep((prev) => (prev + 1) % flowSteps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const flowIcons = [MobileOutlined, SwapRightOutlined, WalletOutlined, FileProtectOutlined];

  return (
    <>
      <LandingHeader onRequestDemo={openDemo} />
      <DemoRequestModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      <main>
        {/* ─── 1. Hero Section ──────────────────────────── */}
        <section className="landing-hero" id="hero">
          <div className="landing-hero-content">
            <Row gutter={[48, 48]} align="middle">
              <Col xs={24} md={14} lg={12}>
                <h1>
                  Stop Chasing Rent.{' '}
                  <span className="highlight">Automate It.</span>
                </h1>
                <p className="hero-subtitle">
                  RentFlow connects your M-Pesa Paybill to a smart wallet system
                  that auto-settles invoices on the 1st of every month. No
                  spreadsheets. No WhatsApp reminders. Just rent — collected.
                </p>
                <div className="hero-cta-group">
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    onClick={openDemo}
                    style={{
                      background: '#52c41a',
                      borderColor: '#52c41a',
                      height: 48,
                      paddingInline: 32,
                      fontWeight: 600,
                      fontSize: 16,
                    }}
                  >
                    Request Demo
                  </Button>
                  <Button
                    size="large"
                    ghost
                    onClick={() =>
                      document
                        .getElementById('flow-demo')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                    style={{
                      height: 48,
                      paddingInline: 32,
                      fontWeight: 600,
                      fontSize: 16,
                      borderColor: 'rgba(255,255,255,0.4)',
                      color: '#ffffff',
                    }}
                  >
                    See How It Works
                  </Button>
                </div>
              </Col>
              <Col xs={0} md={10} lg={12}>
                <div className="hero-mockup">
                  <div className="hero-flow-mini">
                    {flowSteps.map((step, i) => {
                      const Icon = flowIcons[i];
                      return (
                        <div
                          key={step.label}
                          className={`hero-flow-step${activeFlowStep === i ? ' active' : ''}`}
                        >
                          <div className="hero-flow-icon">
                            <Icon />
                          </div>
                          <div className="hero-flow-label">{step.label}</div>
                          <div className="hero-flow-amount">{step.amount}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </section>

        {/* ─── 2. Social Proof Bar ──────────────────────── */}
        <section className="landing-trust-bar">
          <div className="landing-trust-inner">
            <p className="trust-headline">
              Trusted by landlords managing <strong>500+ units</strong> across
              Nairobi, Mombasa, and Kisumu
            </p>
            <div className="trust-badges">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div className="trust-badge" key={badge.label}>
                    <Icon />
                    <span>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 3. Pain Points ───────────────────────────── */}
        <section className="landing-pain-points" id="pain-points">
          <div className="landing-section-inner">
            <h2 className="landing-section-title">Sound Familiar?</h2>
            <p className="landing-section-subtitle">
              If you manage rental properties in Kenya, you have felt these pains.
              RentFlow eliminates every single one.
            </p>
            <Row gutter={[24, 24]}>
              {painPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <Col xs={24} sm={12} key={point.title}>
                    <div className="pain-card">
                      <div className="pain-card-icon">
                        <Icon />
                      </div>
                      <div className="pain-card-title">{point.title}</div>
                      <div className="pain-card-desc">{point.description}</div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        </section>

        {/* ─── 4. Live Flow Demo ────────────────────────── */}
        <section className="landing-flow-demo" id="flow-demo">
          <div className="landing-section-inner">
            <h2 className="landing-section-title" style={{ color: '#fff' }}>
              See the M-Pesa Magic
            </h2>
            <p
              className="landing-section-subtitle"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              From payment to settled invoice in seconds — fully automated.
            </p>
            <div className="flow-steps-container">
              {flowSteps.map((step, i) => {
                const Icon = flowIcons[i];
                return (
                  <div key={step.label} className="flow-step-wrapper">
                    <div
                      className={`flow-step-card${activeFlowStep === i ? ' flow-step-active' : ''}`}
                    >
                      <div className="flow-step-icon">
                        <Icon />
                      </div>
                      <div className="flow-step-num">Step {i + 1}</div>
                      <div className="flow-step-label">{step.label}</div>
                      <div className="flow-step-detail">{step.detail}</div>
                      <div className="flow-step-amount">{step.amount}</div>
                    </div>
                    {i < flowSteps.length - 1 && (
                      <div
                        className={`flow-connector${activeFlowStep > i ? ' flow-connector-active' : ''}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 5. Features Grid ─────────────────────────── */}
        <section className="landing-features" id="features">
          <div className="landing-section-inner">
            <h2 className="landing-section-title">
              Everything You Need to Manage Rentals
            </h2>
            <p className="landing-section-subtitle">
              From M-Pesa payments to automated invoicing, RentFlow handles the
              heavy lifting so you can focus on growing your portfolio.
            </p>
            <Row gutter={[24, 24]}>
              {features.map((feature) => (
                <Col
                  xs={24}
                  sm={12}
                  lg={feature.highlighted ? 24 : 8}
                  key={feature.title}
                >
                  <FeatureCard feature={feature} />
                </Col>
              ))}
            </Row>
          </div>
        </section>

        {/* ─── 6. How It Works ──────────────────────────── */}
        <section className="landing-how-it-works" id="how-it-works">
          <div className="landing-section-inner">
            <h2 className="landing-section-title">How It Works</h2>
            <p className="landing-section-subtitle">
              Get up and running in minutes. Three simple steps to automated
              rent collection.
            </p>
            <div className="steps-row">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div className="step-wrapper" key={step.number}>
                    <div className="step-card">
                      <div className="step-icon-circle">
                        <Icon />
                      </div>
                      <div className="step-number">{step.number}</div>
                      <div className="step-title">{step.title}</div>
                      <div className="step-desc">{step.description}</div>
                    </div>
                    {i < steps.length - 1 && <div className="step-connector" />}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 7. Comparison Table ──────────────────────── */}
        <section className="landing-comparison" id="comparison">
          <div className="landing-section-inner">
            <h2 className="landing-section-title">
              RentFlow vs. The Old Way
            </h2>
            <p className="landing-section-subtitle">
              See how automated property management compares to manual processes.
            </p>
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Manual / Spreadsheet</th>
                    <th className="comparison-highlight">RentFlow</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.feature}>
                      <td className="comparison-feature">{row.feature}</td>
                      <td className="comparison-manual">
                        <CloseCircleOutlined
                          style={{ color: '#ff4d4f', marginRight: 8 }}
                        />
                        {row.manual}
                      </td>
                      <td className="comparison-rentflow">
                        <CheckCircleOutlined
                          style={{ color: '#52c41a', marginRight: 8 }}
                        />
                        {row.rentflow}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── 8. Tenant Portal ─────────────────────────── */}
        <section className="landing-tenant-portal" id="tenant-portal">
          <div className="landing-section-inner">
            <Row gutter={[48, 48]} align="middle">
              <Col xs={24} md={12}>
                <h2
                  className="landing-section-title"
                  style={{ textAlign: 'left', marginBottom: 12 }}
                >
                  Tenant Self-Service Portal
                </h2>
                <p style={{ color: '#8c8c8c', fontSize: 16, marginBottom: 32 }}>
                  Give tenants full visibility into their invoices, payments,
                  and maintenance requests — reducing your phone calls and WhatsApp
                  messages.
                </p>
                <ul className="tenant-feature-list">
                  {tenantFeatures.map((item) => (
                    <li key={item}>
                      <CheckCircleFilled className="tenant-check-icon" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Col>
              <Col xs={24} md={12}>
                <Card
                  style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                  title={
                    <span style={{ fontWeight: 600 }}>
                      <UserOutlined style={{ marginRight: 8 }} />
                      Tenant Portal
                    </span>
                  }
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                      style={{
                        padding: 16,
                        background: '#f6ffed',
                        borderRadius: 8,
                        border: '1px solid #b7eb8f',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>Wallet Balance</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>
                        KES 12,500
                      </div>
                    </div>
                    <div
                      style={{
                        padding: 16,
                        background: '#fff7e6',
                        borderRadius: 8,
                        border: '1px solid #ffe58f',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            Invoice INV-T001-2026-03
                          </div>
                          <div style={{ fontWeight: 600 }}>KES 38,700</div>
                        </div>
                        <div
                          style={{
                            background: '#faad14',
                            color: '#fff',
                            padding: '2px 10px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            alignSelf: 'center',
                          }}
                        >
                          Due 5th
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: 16,
                        background: '#f0f5ff',
                        borderRadius: 8,
                        border: '1px solid #adc6ff',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                        Maintenance Request
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        Plumbing — Kitchen sink leak
                      </div>
                      <div style={{ fontSize: 12, color: '#1890ff', marginTop: 4 }}>
                        Status: In Progress
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </section>

        {/* ─── 9. Pricing ───────────────────────────────── */}
        <section className="landing-pricing" id="pricing">
          <div className="landing-section-inner">
            <h2 className="landing-section-title">
              Simple, Transparent Pricing
            </h2>
            <p className="landing-section-subtitle">
              Start with a 14-day free trial. No credit card required.
            </p>
            <Row gutter={[24, 24]} justify="center">
              {pricingPlans.map((plan) => (
                <Col xs={24} sm={12} lg={8} key={plan.name}>
                  <div
                    className={`pricing-card${plan.highlighted ? ' pricing-card-highlighted' : ''}`}
                  >
                    {plan.highlighted && (
                      <div className="pricing-badge">Most Popular</div>
                    )}
                    <div className="pricing-name">{plan.name}</div>
                    <div className="pricing-price">
                      {plan.price}
                      <span className="pricing-period">{plan.period}</span>
                    </div>
                    <div className="pricing-desc">{plan.description}</div>
                    <ul className="pricing-features">
                      {plan.features.map((f) => (
                        <li key={f}>
                          <CheckCircleFilled
                            style={{ color: '#52c41a', marginRight: 8 }}
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      type={plan.highlighted ? 'primary' : 'default'}
                      size="large"
                      block
                      onClick={openDemo}
                      style={
                        plan.highlighted
                          ? {
                              background: '#52c41a',
                              borderColor: '#52c41a',
                              height: 44,
                              fontWeight: 600,
                            }
                          : { height: 44, fontWeight: 600 }
                      }
                    >
                      Request Demo
                    </Button>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </section>

        {/* ─── 10. Testimonials ─────────────────────────── */}
        <section className="landing-testimonials" id="testimonials">
          <div className="landing-section-inner">
            <h2 className="landing-section-title">
              What Landlords Are Saying
            </h2>
            <p className="landing-section-subtitle">
              Real results from property managers across Kenya.
            </p>
            <Row gutter={[24, 24]}>
              {testimonials.map((t) => (
                <Col xs={24} md={8} key={t.name}>
                  <div className="testimonial-card">
                    <div className="testimonial-quote">&ldquo;{t.quote}&rdquo;</div>
                    <div className="testimonial-result">{t.result}</div>
                    <div className="testimonial-author">
                      <div
                        className="testimonial-avatar"
                        style={{ background: t.color }}
                      >
                        {t.initials}
                      </div>
                      <div>
                        <div className="testimonial-name">{t.name}</div>
                        <div className="testimonial-role">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </section>

        {/* ─── 11. FAQ ──────────────────────────────────── */}
        <section className="landing-faq" id="faq">
          <div className="landing-section-inner">
            <h2 className="landing-section-title">
              Frequently Asked Questions
            </h2>
            <p className="landing-section-subtitle">
              Everything you need to know about RentFlow.
            </p>
            <div className="faq-wrapper">
              <Collapse
                accordion
                size="large"
                items={faqItems.map((item, i) => ({
                  key: String(i),
                  label: item.question,
                  children: <p>{item.answer}</p>,
                }))}
              />
            </div>
          </div>
        </section>

        {/* ─── 12. Stats Bar ────────────────────────────── */}
        <section className="landing-stats">
          <div className="landing-stats-inner">
            {stats.map((stat) => (
              <div className="landing-stat-item" key={stat.label}>
                <div className="landing-stat-value">{stat.value}</div>
                <div className="landing-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 13. Final CTA ────────────────────────────── */}
        <section className="landing-cta">
          <h2>Ready to Automate Your Rent Collection?</h2>
          <p>
            Join landlords across Kenya who are saving hours every month with
            RentFlow. Start your 14-day free trial today.
          </p>
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={openDemo}
            style={{
              background: '#52c41a',
              borderColor: '#52c41a',
              height: 48,
              paddingInline: 32,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Request Demo
          </Button>
          <div className="landing-cta-link">
            Already have an account?{' '}
            <Link href="/login">Sign in</Link>
          </div>
        </section>
      </main>

      <LandingFooter onRequestDemo={openDemo} />
    </>
  );
}
