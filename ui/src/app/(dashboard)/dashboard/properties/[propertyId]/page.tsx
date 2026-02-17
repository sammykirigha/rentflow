"use client";

import { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Tag,
  Card,
  Descriptions,
  Modal,
  Form,
  Input,
  InputNumber,
  App,
  Select,
  Space,
  Spin,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  HomeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { propertiesApi, unitsApi } from '@/lib/api/properties.api';
import { formatKES } from '@/lib/format-kes';
import type { Property, Unit, CreateUnitInput } from '@/types/properties';
import { UnitType, UNIT_TYPE_LABELS } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';
import { useParams, useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editUnitForm] = Form.useForm();

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => propertiesApi.getOne(propertyId),
    enabled: isAuthenticated && !!propertyId,
  });

  const { data: unitsData, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['units', propertyId],
    queryFn: () => unitsApi.getByProperty(propertyId),
    enabled: isAuthenticated && !!propertyId,
  });

  const units: Unit[] = Array.isArray(unitsData) ? unitsData : [];

  const occupiedCount = units.filter((u) => u.isOccupied).length;
  const vacantCount = units.length - occupiedCount;
  const totalRent = units.reduce((sum, u) => sum + Number(u.rentAmount), 0);

  const createUnitMutation = useMutation({
    mutationFn: (values: CreateUnitInput) => unitsApi.create(values),
    onSuccess: () => {
      message.success('Unit added successfully');
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      setIsAddUnitOpen(false);
      unitForm.resetFields();
    },
    onError: () => {
      message.error('Failed to add unit');
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: (values: Partial<Property>) => propertiesApi.update(propertyId, values),
    onSuccess: () => {
      message.success('Property updated successfully');
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setIsEditOpen(false);
    },
    onError: () => {
      message.error('Failed to update property');
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ unitId, data }: { unitId: string; data: Partial<{ unitNumber: string; rentAmount: number; unitType: string }> }) =>
      unitsApi.update(unitId, data),
    onSuccess: () => {
      message.success('Unit updated successfully');
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      setIsEditUnitOpen(false);
      setEditingUnit(null);
      editUnitForm.resetFields();
    },
    onError: () => {
      message.error('Failed to update unit');
    },
  });

  const handleAddUnit = async () => {
    try {
      const values = await unitForm.validateFields();
      createUnitMutation.mutate({
        propertyId,
        unitNumber: values.unitNumber,
        rentAmount: values.rentAmount,
        unitType: values.unitType,
      });
    } catch {
      // validation inline
    }
  };

  const handleEditProperty = async () => {
    try {
      const values = await editForm.validateFields();
      updatePropertyMutation.mutate(values);
    } catch {
      // validation inline
    }
  };

  const openEditModal = () => {
    if (property) {
      editForm.setFieldsValue({
        name: property.name,
        location: property.location,
        address: property.address,
        paybillNumber: property.paybillNumber,
      });
    }
    setIsEditOpen(true);
  };

  const openEditUnitModal = (unit: Unit) => {
    setEditingUnit(unit);
    editUnitForm.setFieldsValue({
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      rentAmount: Number(unit.rentAmount),
    });
    setIsEditUnitOpen(true);
  };

  const handleEditUnit = async () => {
    try {
      const values = await editUnitForm.validateFields();
      if (!editingUnit) return;
      updateUnitMutation.mutate({
        unitId: editingUnit.unitId,
        data: values,
      });
    } catch {
      // validation inline
    }
  };

  const unitColumns: ColumnsType<Unit> = [
    {
      title: 'Unit Number',
      dataIndex: 'unitNumber',
      key: 'unitNumber',
      sorter: (a, b) => a.unitNumber.localeCompare(b.unitNumber),
    },
    {
      title: 'Type',
      dataIndex: 'unitType',
      key: 'unitType',
      render: (unitType: UnitType) => (
        <Tag>{UNIT_TYPE_LABELS[unitType] || unitType}</Tag>
      ),
      filters: Object.entries(UNIT_TYPE_LABELS).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.unitType === value,
    },
    {
      title: 'Rent Amount',
      dataIndex: 'rentAmount',
      key: 'rentAmount',
      render: (value: number) => formatKES(value),
      sorter: (a, b) => Number(a.rentAmount) - Number(b.rentAmount),
      align: 'right',
    },
    {
      title: 'Status',
      dataIndex: 'isOccupied',
      key: 'isOccupied',
      render: (isOccupied: boolean) => (
        <Tag color={isOccupied ? 'blue' : 'green'}>
          {isOccupied ? 'Occupied' : 'Vacant'}
        </Tag>
      ),
      filters: [
        { text: 'Occupied', value: true },
        { text: 'Vacant', value: false },
      ],
      onFilter: (value, record) => record.isOccupied === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Unit) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEditUnitModal(record)}
        >
          Edit
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!property) {
    return (
      <Empty description="Property not found">
        <Button type="primary" onClick={() => router.push('/dashboard/properties')}>
          Back to Properties
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/dashboard/properties')}
          />
          <Title level={4} style={{ margin: 0 }}>
            <HomeOutlined style={{ marginRight: 8 }} />
            {property.name}
          </Title>
          <Tag color={property.isActive ? 'green' : 'red'}>
            {property.isActive ? 'Active' : 'Inactive'}
          </Tag>
        </Space>
        <Button icon={<EditOutlined />} onClick={openEditModal}>
          Edit Property
        </Button>
      </div>

      {/* Property Details */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 4 }}>
          <Descriptions.Item label="Location">{property.location}</Descriptions.Item>
          <Descriptions.Item label="Address">{property.address || '-'}</Descriptions.Item>
          <Descriptions.Item label="Paybill Number">{property.paybillNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Total Units">{property.totalUnits}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Unit Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Text type="secondary">Total Units</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>{units.length}</Title>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Text type="secondary">Occupied</Text>
          <Title level={3} style={{ margin: '4px 0 0', color: '#1890ff' }}>{occupiedCount}</Title>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Text type="secondary">Vacant</Text>
          <Title level={3} style={{ margin: '4px 0 0', color: '#52c41a' }}>{vacantCount}</Title>
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Text type="secondary">Total Rent Potential</Text>
          <Title level={3} style={{ margin: '4px 0 0' }}>{formatKES(totalRent)}</Title>
        </Card>
      </div>

      {/* Units Table */}
      <Card
        title="Units"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddUnitOpen(true)}
          >
            Add Unit
          </Button>
        }
      >
        <Table<Unit>
          columns={unitColumns}
          dataSource={units}
          loading={isLoadingUnits}
          rowKey="unitId"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} units`,
          }}
          locale={{ emptyText: <Empty description="No units yet. Add your first unit." /> }}
        />
      </Card>

      {/* Add Unit Modal */}
      <Modal
        title="Add Unit"
        open={isAddUnitOpen}
        onOk={handleAddUnit}
        onCancel={() => {
          setIsAddUnitOpen(false);
          unitForm.resetFields();
        }}
        confirmLoading={createUnitMutation.isPending}
        okText="Add Unit"
      >
        <Form form={unitForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="unitNumber"
            label="Unit Number"
            rules={[{ required: true, message: 'Please enter the unit number' }]}
          >
            <Input placeholder="e.g. A-101" />
          </Form.Item>
          <Form.Item
            name="unitType"
            label="Unit Type"
            initialValue={UnitType.ONE_BEDROOM}
          >
            <Select
              options={Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="rentAmount"
            label="Monthly Rent (KES)"
            rules={[{ required: true, message: 'Please enter the rent amount' }]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              placeholder="e.g. 25000"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Property Modal */}
      <Modal
        title="Edit Property"
        open={isEditOpen}
        onOk={handleEditProperty}
        onCancel={() => setIsEditOpen(false)}
        confirmLoading={updatePropertyMutation.isPending}
        okText="Save Changes"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Property Name"
            rules={[{ required: true, message: 'Please enter the property name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="location"
            label="Location"
            rules={[{ required: true, message: 'Please enter the location' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Form.Item name="paybillNumber" label="M-Pesa Paybill Number">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Unit Modal */}
      <Modal
        title={`Edit Unit ${editingUnit?.unitNumber || ''}`}
        open={isEditUnitOpen}
        onOk={handleEditUnit}
        onCancel={() => {
          setIsEditUnitOpen(false);
          setEditingUnit(null);
          editUnitForm.resetFields();
        }}
        confirmLoading={updateUnitMutation.isPending}
        okText="Save Changes"
      >
        <Form form={editUnitForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="unitNumber"
            label="Unit Number"
            rules={[{ required: true, message: 'Please enter the unit number' }]}
          >
            <Input placeholder="e.g. A-101" />
          </Form.Item>
          <Form.Item
            name="unitType"
            label="Unit Type"
          >
            <Select
              options={Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="rentAmount"
            label="Monthly Rent (KES)"
            rules={[{ required: true, message: 'Please enter the rent amount' }]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              placeholder="e.g. 25000"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
