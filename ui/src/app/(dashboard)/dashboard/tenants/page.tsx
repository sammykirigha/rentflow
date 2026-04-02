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
  Upload,
  Steps,
  Grid,
} from 'antd';
import type { RcFile } from 'antd/es/upload';
import { PlusOutlined, EyeOutlined, TeamOutlined, SearchOutlined, ExportOutlined, UploadOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { tenantsApi } from '@/lib/api/tenants.api';
import { propertiesApi, unitsApi } from '@/lib/api/properties.api';
import { parseError } from '@/lib/api/parseError';
import { uploadImage } from '@/lib/api/upload.api';
import { formatKES } from '@/lib/format-kes';
import type { Tenant, CreateTenantInput, TenantStatus } from '@/types/tenants';
import type { Property, Unit } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
  const [currentStep, setCurrentStep] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [idCopyKey, setIdCopyKey] = useState<string | undefined>(undefined);
  const [idCopyName, setIdCopyName] = useState<string | undefined>(undefined);
  const [kraCertKey, setKraCertKey] = useState<string | undefined>(undefined);
  const [kraCertName, setKraCertName] = useState<string | undefined>(undefined);
  const [uploadingIdCopy, setUploadingIdCopy] = useState(false);
  const [uploadingKraCert, setUploadingKraCert] = useState(false);
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
      setCurrentStep(0);
      setSelectedPropertyId(undefined);
      setIdCopyKey(undefined);
      setIdCopyName(undefined);
      setKraCertKey(undefined);
      setKraCertName(undefined);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to create tenant'));
    },
  });

  // Fields validated per step
  const stepFields: string[][] = [
    ['name', 'email', 'phone'],
    [],  // Step 2 has no required fields (ID & docs are optional)
    ['unitId', 'leaseStart'],
  ];

  const handleNext = async () => {
    try {
      await form.validateFields(stepFields[currentStep]);
      setCurrentStep(currentStep + 1);
    } catch {
      // validation errors shown inline
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleCreate = async () => {
    try {
      await form.validateFields(stepFields[currentStep]);
      const values = form.getFieldsValue(true);
      const payload: CreateTenantInput = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        unitId: values.unitId,
        leaseStart: values.leaseStart.toISOString(),
        leaseEnd: values.leaseEnd ? values.leaseEnd.toISOString() : undefined,
        depositAmount: values.depositAmount || undefined,
        idNumber: values.idNumber || undefined,
        idCopyKey: idCopyKey || undefined,
        kraCertificateKey: kraCertKey || undefined,
      };
      createMutation.mutate(payload);
    } catch {
      // validation errors are shown inline by Ant Design
    }
  };

  const handleFileUpload = async (
    file: RcFile,
    setKey: (key: string | undefined) => void,
    setName: (name: string | undefined) => void,
    setUploading: (uploading: boolean) => void,
    label: string,
  ) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      message.error('File must be smaller than 5MB');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadImage(file);
      if (result?.key) {
        setKey(result.key);
        setName(file.name);
        message.success(`${label} uploaded successfully`);
      } else {
        message.error(`Failed to upload ${label}`);
      }
    } catch {
      message.error(`Failed to upload ${label}`);
    } finally {
      setUploading(false);
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await tenantsApi.getAll({ limit: 10000, search: searchText || undefined });
      const allData: Tenant[] = Array.isArray(all?.data) ? all.data : [];
      const csvColumns: CsvColumn<Tenant>[] = [
        { header: 'Name', accessor: (r) => `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() },
        { header: 'Email', accessor: (r) => r.user?.email || '' },
        { header: 'Phone', accessor: (r) => r.user?.phone || '' },
        { header: 'Property', accessor: (r) => r.unit?.property?.name || '' },
        { header: 'Unit', accessor: (r) => r.unit?.unitNumber || '' },
        { header: 'Wallet Balance', accessor: (r) => Number(r.walletBalance ?? 0) },
        { header: 'Status', accessor: (r) => STATUS_LABEL_MAP[r.status] || r.status },
      ];
      downloadCsv(allData, csvColumns, 'tenants.csv');
    } finally {
      setExporting(false);
    }
  };

  const renderMobileTenantCard = (tenant: Tenant) => {
    const name = `${tenant.user?.firstName || ''} ${tenant.user?.lastName || ''}`.trim() || '-';
    return (
      <Link key={tenant.tenantId} href={`/dashboard/tenants/${tenant.tenantId}`} style={{ textDecoration: 'none' }}>
        <Card size="small" style={{ marginBottom: 8, cursor: 'pointer' }} styles={{ body: { padding: '12px 14px' } }} hoverable>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Text strong style={{ fontSize: 14, display: 'block' }}>{name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{tenant.user?.phone || '-'}</Text>
            </div>
            <Tag color={STATUS_COLOR_MAP[tenant.status] || 'default'} style={{ margin: 0 }}>
              {STATUS_LABEL_MAP[tenant.status] || tenant.status}
            </Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tenant.unit?.property?.name || '-'} · {tenant.unit?.unitNumber || '-'}
            </Text>
            <Text strong style={{ fontSize: 13, color: '#1890ff' }}>
              {formatKES(tenant.walletBalance ?? 0)}
            </Text>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 8 : 0,
        marginBottom: isMobile ? 12 : 24,
      }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          Tenants
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={isLoading || tenants.length === 0}
            size={isMobile ? 'small' : 'middle'}
          >
            {!isMobile && 'Export CSV'}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            size={isMobile ? 'small' : 'middle'}
          >
            Add Tenant
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: isMobile ? 8 : 16 }}>
        <Input
          placeholder="Search tenants..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          allowClear
          style={{ maxWidth: isMobile ? '100%' : 400 }}
          size={isMobile ? 'middle' : 'large'}
        />
      </div>

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading...</Text></div>
          ) : tenants.length === 0 ? (
            <Card><Text type="secondary">No tenants found.</Text></Card>
          ) : (
            <>
              {tenants.map(renderMobileTenantCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {tenants.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > tenants.length && (
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" onClick={() => setPageSize(pageSize + 10)}>Load More</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <Card>
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
      )}

      <Modal
        title="Add Tenant"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setCurrentStep(0);
          setSelectedPropertyId(undefined);
          setIdCopyKey(undefined);
          setIdCopyName(undefined);
          setKraCertKey(undefined);
          setKraCertName(undefined);
        }}
        width={560}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > 0 && (
                <Button onClick={handlePrev}>Back</Button>
              )}
            </div>
            <Space>
              <Button onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
                setCurrentStep(0);
                setSelectedPropertyId(undefined);
                setIdCopyKey(undefined);
                setIdCopyName(undefined);
                setKraCertKey(undefined);
                setKraCertName(undefined);
              }}>
                Cancel
              </Button>
              {currentStep < 2 ? (
                <Button type="primary" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="primary" onClick={handleCreate} loading={createMutation.isPending}>
                  Create Tenant
                </Button>
              )}
            </Space>
          </div>
        }
      >
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 24, marginTop: 8 }}
          items={[
            { title: 'Personal Info' },
            { title: 'ID & Documents' },
            { title: 'Unit & Lease' },
          ]}
        />

        <Form
          form={form}
          layout="vertical"
          style={{ minHeight: 240 }}
        >
          {/* Step 1: Personal Info */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
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
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="e.g. jane@example.com (optional)" />
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
              message="A login password will be auto-generated and sent to the tenant via SMS (and email if provided)."
              type="info"
              showIcon
            />
          </div>

          {/* Step 2: ID & Documents */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Form.Item
              name="idNumber"
              label="ID / Passport Number"
            >
              <Input placeholder="e.g. 12345678" />
            </Form.Item>

            <Form.Item label="ID Copy (scan/photo)">
              {idCopyKey ? (
                <Space>
                  <FileTextOutlined />
                  <span>{idCopyName || 'Uploaded'}</span>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => { setIdCopyKey(undefined); setIdCopyName(undefined); }}
                  />
                </Space>
              ) : (
                <Upload
                  accept=".pdf,.jpg,.jpeg,.png"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    if (file.size > 5 * 1024 * 1024) {
                      message.error('File must be smaller than 5MB');
                      return false;
                    }
                    return true;
                  }}
                  customRequest={({ file }) => handleFileUpload(file as RcFile, setIdCopyKey, setIdCopyName, setUploadingIdCopy, 'ID Copy')}
                >
                  <Button icon={<UploadOutlined />} loading={uploadingIdCopy}>Upload ID Copy</Button>
                </Upload>
              )}
            </Form.Item>

            <Form.Item label="KRA Certificate">
              {kraCertKey ? (
                <Space>
                  <FileTextOutlined />
                  <span>{kraCertName || 'Uploaded'}</span>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => { setKraCertKey(undefined); setKraCertName(undefined); }}
                  />
                </Space>
              ) : (
                <Upload
                  accept=".pdf,.jpg,.jpeg,.png"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    if (file.size > 5 * 1024 * 1024) {
                      message.error('File must be smaller than 5MB');
                      return false;
                    }
                    return true;
                  }}
                  customRequest={({ file }) => handleFileUpload(file as RcFile, setKraCertKey, setKraCertName, setUploadingKraCert, 'KRA Certificate')}
                >
                  <Button icon={<UploadOutlined />} loading={uploadingKraCert}>Upload KRA Certificate</Button>
                </Upload>
              )}
            </Form.Item>

            <Alert
              message="These documents are optional but recommended for tenant verification."
              type="info"
              showIcon
            />
          </div>

          {/* Step 3: Unit & Lease */}
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                parser={(value) => Number(value?.replace(/,/g, '') || 0) as any}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
