'use client';

import { Tabs, Typography, Grid } from 'antd';
import AgingReport from '../components/aging-report';
import PropertyPnl from './components/property-pnl';
import CashFlowForecast from '../components/cash-flow-forecast';
import TaxReport from './components/tax-report';
import OwnerReport from './components/owner-report';

const { Title } = Typography;
const { useBreakpoint } = Grid;

export default function ReportsPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const tabItems = [
    {
      key: 'aging',
      label: 'Aging Report',
      children: <AgingReport />,
    },
    {
      key: 'pnl',
      label: 'Property P&L',
      children: <PropertyPnl />,
    },
    {
      key: 'cashflow',
      label: 'Cash Flow',
      children: <CashFlowForecast />,
    },
    {
      key: 'tax',
      label: 'Tax Report',
      children: <TaxReport />,
    },
    {
      key: 'owner',
      label: 'Owner Report',
      children: <OwnerReport />,
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: isMobile ? 12 : 24 }}>Reports</Title>
      <Tabs
        items={tabItems}
        size={isMobile ? 'small' : 'large'}
        defaultActiveKey="aging"
      />
    </div>
  );
}
