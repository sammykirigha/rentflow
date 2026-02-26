'use client';

import { useState } from 'react';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Input, InputNumber, Space, Spin, Switch, Table } from 'antd';
import type { RecurringCharge } from '@/types/settings';
import { formatKES } from '@/lib/format-kes';

export default function InvoiceSettingsTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { message: messageApi } = App.useApp();

  const [charges, setCharges] = useState<RecurringCharge[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize charges from settings on first load
  if (settings && !initialized) {
    setCharges(settings.recurringCharges || []);
    setInitialized(true);
  }

  const handleAddCharge = () => {
    setCharges([...charges, { name: '', amount: 0, enabled: true }]);
  };

  const handleRemoveCharge = (index: number) => {
    setCharges(charges.filter((_, i) => i !== index));
  };

  const handleUpdateCharge = (index: number, field: keyof RecurringCharge, value: string | number | boolean) => {
    const updated = [...charges];
    updated[index] = { ...updated[index], [field]: value };
    setCharges(updated);
  };

  const handleSave = async () => {
    // Validate: all charges must have a name
    const invalid = charges.some(c => !c.name.trim());
    if (invalid) {
      messageApi.error('All charges must have a name');
      return;
    }

    // Validate: no negative amounts
    const negativeAmount = charges.some(c => c.amount < 0);
    if (negativeAmount) {
      messageApi.error('Charge amounts cannot be negative');
      return;
    }

    try {
      await updateSettings.mutateAsync({ recurringCharges: charges });
      messageApi.success('Recurring charges saved');
    } catch {
      messageApi.error('Failed to save recurring charges');
    }
  };

  if (isLoading) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  const enabledTotal = charges
    .filter(c => c.enabled)
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const columns = [
    {
      title: 'Charge Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, __: RecurringCharge, index: number) => (
        <Input
          value={charges[index].name}
          onChange={(e) => handleUpdateCharge(index, 'name', e.target.value)}
          placeholder="e.g. Garbage Collection"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Amount (KES)',
      dataIndex: 'amount',
      key: 'amount',
      width: 180,
      render: (_: number, __: RecurringCharge, index: number) => (
        <InputNumber
          value={charges[index].amount}
          onChange={(value) => handleUpdateCharge(index, 'amount', value ?? 0)}
          min={0}
          style={{ width: '100%' }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => Number(value?.replace(/,/g, '') || 0)}
        />
      ),
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      align: 'center' as const,
      render: (_: boolean, __: RecurringCharge, index: number) => (
        <Switch
          checked={charges[index].enabled}
          onChange={(value) => handleUpdateCharge(index, 'enabled', value)}
          size="small"
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, __: RecurringCharge, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveCharge(index)}
          size="small"
        />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Recurring Charges</div>
        <div style={{ color: '#666', fontSize: 13 }}>
          Configure charges that are automatically added to every monthly invoice (e.g. garbage collection, service charge).
          These are included in the &quot;Other Charges&quot; line item.
        </div>
      </div>

      <Card>
        <Table
          dataSource={charges}
          columns={columns}
          pagination={false}
          rowKey={(_, index) => String(index)}
          size="small"
          locale={{ emptyText: 'No recurring charges configured' }}
        />

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="dashed"
            onClick={handleAddCharge}
            icon={<PlusOutlined />}
          >
            Add Charge
          </Button>

          {charges.length > 0 && (
            <span style={{ color: '#666', fontSize: 13 }}>
              Monthly total (enabled): <strong>{formatKES(enabledTotal)}</strong>
            </span>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <Space>
            <Button
              onClick={() => {
                setCharges(settings?.recurringCharges || []);
              }}
            >
              Reset
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={updateSettings.isPending}
            >
              Save Changes
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
