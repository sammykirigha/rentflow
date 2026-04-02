'use client';

import { useState } from 'react';
import { Typography, Card, DatePicker, Button, App, Space, Grid, Spin } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Text } = Typography;
const { useBreakpoint } = Grid;

export default function OwnerReport() {
  const { message: messageApi } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'month'));
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const month = selectedMonth.format('YYYY-MM');
      const response = await api.get('/reports/owner-report', {
        params: { month },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OwnerReport-${month}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      messageApi.success('Owner report downloaded successfully');
    } catch {
      messageApi.error('Failed to generate owner report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Card>
        <div style={{ textAlign: 'center', padding: isMobile ? '16px 0' : '24px 0' }}>
          <FileTextOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 18 }}>Monthly Owner Report</Text>
          </div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Generate a comprehensive PDF report including revenue, expenses, net income,
            occupancy rates, property breakdown, top debtors, and maintenance summary.
          </Text>

          <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 300, margin: '0 auto' }}>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12, textAlign: 'left' }}>
                Report Month
              </Text>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={(date) => date && setSelectedMonth(date)}
                disabledDate={(current) => current && current > dayjs()}
                style={{ width: '100%' }}
                size={isMobile ? 'middle' : 'large'}
              />
            </div>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={downloading}
              size="large"
              block
            >
              {downloading ? 'Generating Report...' : 'Download Report'}
            </Button>
          </Space>

          {downloading && (
            <div style={{ marginTop: 16 }}>
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                Generating PDF with all financial data...
              </Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
