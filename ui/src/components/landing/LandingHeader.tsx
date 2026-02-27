'use client';

import { Button } from 'antd';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface LandingHeaderProps {
  onRequestDemo?: () => void;
}

export default function LandingHeader({ onRequestDemo }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className={`landing-header${scrolled ? ' scrolled' : ''}`}>
      <nav className="landing-header-inner">
        <Link href="/" className="landing-logo">
          Rent<span>Flow</span>
        </Link>
        <div className="landing-nav-links">
          <a onClick={() => scrollTo('features')}>Features</a>
          <a onClick={() => scrollTo('pricing')}>Pricing</a>
          <a onClick={() => scrollTo('faq')}>FAQ</a>
        </div>
        <div className="landing-header-actions">
          <Link href="/login">
            <Button type="text" size="large">
              Login
            </Button>
          </Link>
          <Button
            type="primary"
            size="large"
            onClick={onRequestDemo}
            style={{
              background: '#52c41a',
              borderColor: '#52c41a',
              fontWeight: 600,
            }}
          >
            Request Demo
          </Button>
        </div>
      </nav>
    </header>
  );
}
