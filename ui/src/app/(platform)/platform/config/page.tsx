'use client';

import {
  getPlatformConfig,
  updatePlatformConfig,
  type PlatformConfig,
} from '@/lib/api/platform.api';
import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Space,
  Table,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function PlatformConfigPage() {
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PlatformConfig | null>(null);
  const [form] = Form.useForm();

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await getPlatformConfig();
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      message.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleOpenAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (config: PlatformConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      key: config.key,
      value: config.value,
      description: config.description,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await updatePlatformConfig(values);
      message.success(editingConfig ? 'Configuration updated' : 'Configuration added');
      setModalOpen(false);
      fetchConfigs();
    } catch {
      // validation error
    }
  };

  const columns = [
    { title: 'Key', dataIndex: 'key', key: 'key', width: 200 },
    { title: 'Value', dataIndex: 'value', key: 'value', width: 200 },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: PlatformConfig) => (
        <Button type="link" size="small" onClick={() => handleEdit(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Platform Configuration</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          Add Config
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={configs}
          rowKey="platformConfigId"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingConfig ? 'Edit Configuration' : 'Add Configuration'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="key"
            label="Key"
            rules={[{ required: true, message: 'Key is required' }]}
          >
            <Input disabled={!!editingConfig} placeholder="e.g. penalty_rate" />
          </Form.Item>
          <Form.Item
            name="value"
            label="Value"
            rules={[{ required: true, message: 'Value is required' }]}
          >
            <Input placeholder="e.g. 0.05" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
