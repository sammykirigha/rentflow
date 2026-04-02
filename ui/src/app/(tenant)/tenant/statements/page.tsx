'use client';

import { useState } from 'react';
import { Typography, Card, DatePicker, Button, App, Space, Grid, Empty } from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '@/stores/user.store';
import api from '@/lib/api';
import dayjs, { type Dayjs } from 'dayjs';

const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

export default function TenantStatementsPage() {
  const { message } = App.useApp();
  const user = useUserStore((state) => state.user);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const tenantId = user?.tenant?.tenantId;

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(
    dayjs().subtract(1, 'month')
  );

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('No tenant account found.');
      }

      const month = selectedMonth.format('YYYY-MM');
      const response = await api.get(`/statements/${tenantId}`, {
        params: { month },
        responseType: 'blob',
      });

      return response.data as Blob;
    },
    onSuccess: (blob) => {
      const month = selectedMonth.format('YYYY-MM');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success('Statement downloaded successfully.');
    },
    onError: () => {
      message.error('Failed to download statement. Please try again.');
    },
  });

  if (!tenantId) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: isMobile ? 24 : 48 }}>
        <Empty
          description="Statement access requires a tenant account."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={isMobile ? 4 : 3} style={{ marginBottom: isMobile ? 12 : 24 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        My Statements
      </Title>

      <Card size={isMobile ? 'small' : 'default'}>
        <Paragraph type="secondary" style={{ marginBottom: isMobile ? 16 : 24 }}>
          Select a month to download your statement showing all invoices, payments,
          and wallet transactions.
        </Paragraph>

        <Space
          direction={isMobile ? 'vertical' : 'horizontal'}
          size={isMobile ? 12 : 16}
          style={{ width: '100%' }}
        >
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={(value) => {
              if (value) {
                setSelectedMonth(value);
              }
            }}
            disabledDate={(current) => current && current.isAfter(dayjs(), 'month')}
            style={{ width: isMobile ? '100%' : 200 }}
            size={isMobile ? 'middle' : 'large'}
          />

          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate()}
            size={isMobile ? 'middle' : 'large'}
            style={{ width: isMobile ? '100%' : undefined }}
          >
            Download Statement
          </Button>
        </Space>
      </Card>
    </div>
  );
}
