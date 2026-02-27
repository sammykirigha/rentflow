'use client';

import { Row, Col } from 'antd';
import { footerLinks } from './constants';

interface LandingFooterProps {
  onRequestDemo?: () => void;
}

export default function LandingFooter({ onRequestDemo }: LandingFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <Row gutter={[48, 32]}>
          {footerLinks.map((group) => (
            <Col xs={24} sm={8} key={group.title}>
              <div className="landing-footer-title">{group.title}</div>
              <ul className="landing-footer-links">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.onClick ? (
                      <a
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          onRequestDemo?.();
                        }}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a href={link.href}>{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </Col>
          ))}
        </Row>
        <div className="landing-footer-divider">
          {year} RentFlow. Built for Kenyan landlords and property managers.
        </div>
      </div>
    </footer>
  );
}
