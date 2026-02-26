"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Card,
  App,
  Alert,
} from 'antd';
import { PlusOutlined, EyeOutlined, TeamOutlined, SearchOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { tenantsApi } from '@/lib/api/tenants.api';
import { propertiesApi, unitsApi } from '@/lib/api/properties.api';
import { parseError } from '@/lib/api/parseError';
import { formatKES } from '@/lib/format-kes';
import type { Tenant, CreateTenantInput, TenantStatus } from '@/types/tenants';
import type { Property, Unit } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

const STATUS_COLOR_MAP: Record<string, string> = {
  active: 'green',
  notice_period: 'orange',
  vacated: 'red',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: 'Active',
  notice_period: 'Notice Period',
  vacated: 'Vacated',
};

export default function TenantsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', searchText, page, pageSize],
    queryFn: () => tenantsApi.getAll({ search: searchText || undefined, page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const tenants: Tenant[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => propertiesApi.getAll({ limit: 200 }),
    enabled: isModalOpen,
  });

  const propertiesList: Property[] = Array.isArray(propertiesData?.data) ? propertiesData.data : [];

  const { data: vacantUnitsData, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['vacant-units', selectedPropertyId],
    queryFn: () => unitsApi.getVacant(selectedPropertyId!),
    enabled: isModalOpen && !!selectedPropertyId,
  });

  const vacantUnits: Unit[] = Array.isArray(vacantUnitsData) ? vacantUnitsData : [];

  const createMutation = useMutation({
    mutationFn: (values: CreateTenantInput) => tenantsApi.create(values),
    onSuccess: () => {
      message.success('Tenant created successfully');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsModalOpen(false);
      form.resetFields();
      setSelectedPropertyId(undefined);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to create tenant'));
    },
  });

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateTenantInput = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        unitId: values.unitId,
        leaseStart: values.leaseStart.toISOString(),
        leaseEnd: values.leaseEnd ? values.leaseEnd.toISOString() : undefined,
        depositAmount: values.depositAmount || undefined,
      };
      createMutation.mutate(payload);
    } catch {
      // validation errors are shown inline by Ant Design
    }
  };

  const columns: ColumnsType<Tenant> = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, record: Tenant) => {
        const firstName = record.user?.firstName || '';
        const lastName = record.user?.lastName || '';
        return `${firstName} ${lastName}`.trim() || '-';
      },
      sorter: (a, b) => {
        const nameA = `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim();
        const nameB = `${b.user?.firstName || ''} ${b.user?.lastName || ''}`.trim();
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Email',
      key: 'email',
      render: (_: unknown, record: Tenant) => record.user?.email || '-',
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_: unknown, record: Tenant) => record.user?.phone || '-',
    },
    {
      title: 'Property',
      key: 'property',
      render: (_: unknown, record: Tenant) => record.unit?.property?.name || '-',
      sorter: (a, b) => {
        const propA = a.unit?.property?.name || '';
        const propB = b.unit?.property?.name || '';
        return propA.localeCompare(propB);
      },
    },
    {
      title: 'Unit',
      key: 'unit',
      render: (_: unknown, record: Tenant) => record.unit?.unitNumber || '-',
      sorter: (a, b) => {
        const unitA = a.unit?.unitNumber || '';
        const unitB = b.unit?.unitNumber || '';
        return unitA.localeCompare(unitB);
      },
    },
    {
      title: 'Wallet Balance',
      key: 'walletBalance',
      render: (_: unknown, record: Tenant) => formatKES(record.walletBalance ?? 0),
      sorter: (a, b) => (a.walletBalance ?? 0) - (b.walletBalance ?? 0),
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: TenantStatus) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Notice Period', value: 'notice_period' },
        { text: 'Vacated', value: 'vacated' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Tenant) => (
        <Link href={`/dashboard/tenants/${record.tenantId}`}>
          <Button type="link" icon={<EyeOutlined />}>
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          Tenants
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Tenant
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search tenants by name, email, or phone..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table<Tenant>
          columns={columns}
          dataSource={tenants}
          loading={isLoading}
          rowKey="tenantId"
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} tenants`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title="Add Tenant"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setSelectedPropertyId(undefined);
        }}
        confirmLoading={createMutation.isPending}
        okText="Create Tenant"
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[
              { required: true, message: 'Please enter the tenant name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input placeholder="e.g. Jane Wanjiku" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter the email address' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="e.g. jane@example.com" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Please enter the phone number' },
              {
                pattern: /^(?:\+254|0)\d{9}$/,
                message: 'Please enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678)',
              },
            ]}
          >
            <Input placeholder="e.g. 0712345678" />
          </Form.Item>

          <Alert
            message="A login password will be auto-generated and sent to the tenant via SMS and email."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            label="Property"
            required
          >
            <Select
              placeholder="Select a property first"
              value={selectedPropertyId}
              onChange={(value) => {
                setSelectedPropertyId(value);
                form.setFieldValue('unitId', undefined);
              }}
              options={propertiesList.map((p) => ({
                label: `${p.name} - ${p.location}`,
                value: p.propertyId,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            name="unitId"
            label="Unit"
            rules={[{ required: true, message: 'Please select a unit' }]}
          >
            <Select
              placeholder={selectedPropertyId ? 'Select a vacant unit' : 'Select a property first'}
              disabled={!selectedPropertyId}
              loading={isLoadingUnits}
              options={vacantUnits.map((u) => ({
                label: `${u.unitNumber} - ${formatKES(u.rentAmount)}/mo`,
                value: u.unitId,
              }))}
              showSearch
              optionFilterProp="label"
              notFoundContent={selectedPropertyId ? 'No vacant units available' : undefined}
            />
          </Form.Item>

          <Space size="middle" style={{ width: '100%' }}>
            <Form.Item
              name="leaseStart"
              label="Lease Start Date"
              rules={[{ required: true, message: 'Please select the lease start date' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="leaseEnd"
              label="Lease End Date"
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item
            name="depositAmount"
            label="Security Deposit (KES)"
            tooltip="One-time security deposit included on the first invoice"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="e.g. 15000 (leave empty for no deposit)"
              min={0}
              max={10000000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value?.replace(/,/g, '') || 0) as any}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
