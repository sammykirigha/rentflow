"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Card,
  App,
  Space,
} from 'antd';
import { PlusOutlined, EyeOutlined, HomeOutlined, ExportOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { propertiesApi } from '@/lib/api/properties.api';
import Link from 'next/link';
import { parseError } from '@/lib/api/parseError';
import type { Property, CreatePropertyInput } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';

const { Title } = Typography;

export default function PropertiesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm<CreatePropertyInput>();

  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['properties', page, pageSize],
    queryFn: () => propertiesApi.getAll({ page, limit: pageSize }),
    enabled: isAuthenticated,
  });

  const properties: Property[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const createMutation = useMutation({
    mutationFn: (values: CreatePropertyInput) => propertiesApi.create(values),
    onSuccess: () => {
      message.success('Property created successfully');
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to create property'));
    },
  });

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      createMutation.mutate(values);
    } catch {
      // validation errors are shown inline by Ant Design
    }
  };

  const columns: ColumnsType<Property> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      sorter: (a, b) => a.location.localeCompare(b.location),
    },
    {
      title: 'Units',
      dataIndex: 'totalUnits',
      key: 'totalUnits',
      sorter: (a, b) => a.totalUnits - b.totalUnits,
      align: 'center',
    },
    {
      title: 'Paybill',
      dataIndex: 'paybillNumber',
      key: 'paybillNumber',
      render: (value: string) => value || '-',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Property) => (
        <Link href={`/dashboard/properties/${record.propertyId}`}>
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
          <HomeOutlined style={{ marginRight: 8 }} />
          Properties
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={() => {
              const csvColumns: CsvColumn<Property>[] = [
                { header: 'Name', accessor: (r) => r.name },
                { header: 'Location', accessor: (r) => r.location },
                { header: 'Total Units', accessor: (r) => r.totalUnits },
                { header: 'Paybill', accessor: (r) => r.paybillNumber || '' },
                { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
              ];
              downloadCsv(properties, csvColumns, 'properties.csv');
            }}
            disabled={isLoading || properties.length === 0}
          >
            Export CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Property
          </Button>
        </Space>
      </div>

      <Card>
        <Table<Property>
          columns={columns}
          dataSource={properties}
          loading={isLoading}
          rowKey="propertyId"
          pagination={{
            current: page,
            pageSize,
            total: pagination?.total || 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} properties`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title="Add Property"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        okText="Create Property"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Property Name"
            rules={[{ required: true, message: 'Please enter the property name' }]}
          >
            <Input placeholder="e.g. Sunrise Apartments" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Location"
            rules={[{ required: true, message: 'Please enter the location' }]}
          >
            <Input placeholder="e.g. Westlands, Nairobi" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input placeholder="Full address (optional)" />
          </Form.Item>

          <Form.Item
            name="totalUnits"
            label="Total Units"
            rules={[{ required: true, message: 'Please enter the total number of units' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="e.g. 20"
            />
          </Form.Item>

          <Form.Item
            name="paybillNumber"
            label="M-Pesa Paybill Number"
          >
            <Input placeholder="e.g. 123456" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
