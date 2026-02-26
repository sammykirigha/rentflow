'use client';

import { userApi, GetUsersResponse } from '@/lib/api/user.api';
import { Role } from '@/types/permissions';
import { User } from '@/types/users';
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';

const { Text } = Typography;

const statusColors: Record<string, string> = {
  active: 'green',
  suspended: 'red',
  pending: 'orange',
};

export default function TeamManagementTab() {
  const { message: messageApi } = App.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [search, setSearch] = useState('');

  // Add manager modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [addLoading, setAddLoading] = useState(false);

  // Suspend modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendUser, setSuspendUser] = useState<User | null>(null);
  const [suspendForm] = Form.useForm();
  const [suspendLoading, setSuspendLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response: GetUsersResponse = await userApi.getAdminUsers({
        page: pagination.current,
        limit: pagination.pageSize,
        search: search || undefined,
      });
      setUsers(response.data);
      setPagination((prev) => ({ ...prev, total: response.pagination.total }));
    } catch {
      messageApi.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, messageApi]);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await userApi.getRoles();
      setRoles(data);
    } catch {
      // Roles fetch is non-critical, silent fail
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination((prev) => ({ ...prev, current: pag.current, pageSize: pag.pageSize }));
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await userApi.updateUserRole(userId, roleId);
      messageApi.success('Role updated');
      fetchUsers();
    } catch {
      messageApi.error('Failed to update role');
    }
  };

  const handleSuspend = (user: User) => {
    setSuspendUser(user);
    suspendForm.resetFields();
    setSuspendModalOpen(true);
  };

  const handleSuspendConfirm = async () => {
    if (!suspendUser) return;
    setSuspendLoading(true);
    try {
      const values = await suspendForm.validateFields();
      await userApi.updateUserStatus(suspendUser.userId, {
        status: 'suspended',
        reason: values.reason,
      });
      messageApi.success('User suspended');
      setSuspendModalOpen(false);
      fetchUsers();
    } catch {
      messageApi.error('Failed to suspend user');
    } finally {
      setSuspendLoading(false);
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await userApi.updateUserStatus(userId, { status: 'active' });
      messageApi.success('User reactivated');
      fetchUsers();
    } catch {
      messageApi.error('Failed to reactivate user');
    }
  };

  const handleAddManager = async () => {
    setAddLoading(true);
    try {
      const values = await addForm.validateFields();
      await userApi.createAdmin(values);
      messageApi.success('Manager created successfully');
      setAddModalOpen(false);
      addForm.resetFields();
      fetchUsers();
    } catch {
      messageApi.error('Failed to create manager');
    } finally {
      setAddLoading(false);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <span>
          {record.firstName} {record.lastName}
        </span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      key: 'role',
      render: (_, record) => (
        <Select
          size="small"
          value={record.roleId}
          style={{ width: 140 }}
          onChange={(roleId) => handleRoleChange(record.userId, roleId)}
          options={roles.map((r) => ({ label: r.name, value: r.roleId }))}
        />
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={statusColors[record.status] ?? 'default'}>{record.status}</Tag>
      ),
    },
    {
      title: 'Last Login',
      key: 'lastLogin',
      render: (_, record) =>
        record.lastLoginAt ? new Date(record.lastLoginAt).toLocaleDateString() : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'suspended' ? (
            <Tooltip title="Reactivate user">
              <Button size="small" type="link" onClick={() => handleReactivate(record.userId)}>
                Reactivate
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Suspend user">
              <Button size="small" type="link" danger onClick={() => handleSuspend(record)}>
                Suspend
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ fontSize: 16 }}>Team</Text>
        <br />
        <Text type="secondary">Manage landlord and manager accounts with access to the admin dashboard.</Text>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Input
          placeholder="Search by name or email"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
          style={{ width: 260 }}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
          Add Manager
        </Button>
      </div>

      <Table<User>
        rowKey="userId"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 700 }}
      />

      {/* Add Manager Modal */}
      <Modal
        title="Add Manager"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleAddManager}
        confirmLoading={addLoading}
        okText="Create"
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" preserve={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="manager@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Min 6 characters" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="firstName" label="First Name">
              <Input prefix={<UserOutlined />} placeholder="First name" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name">
              <Input prefix={<UserOutlined />} placeholder="Last name" />
            </Form.Item>
          </div>
          <Form.Item
            name="roleId"
            label="Role"
            rules={[{ required: true, message: 'Role is required' }]}
          >
            <Select
              placeholder="Select a role"
              options={roles.map((r) => ({ label: r.name, value: r.roleId }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Suspend User Modal */}
      <Modal
        title={`Suspend ${suspendUser?.firstName ?? ''} ${suspendUser?.lastName ?? ''}?`}
        open={suspendModalOpen}
        onCancel={() => setSuspendModalOpen(false)}
        onOk={handleSuspendConfirm}
        confirmLoading={suspendLoading}
        okText="Suspend"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <p>This user will lose access to the platform until reactivated.</p>
        <Form form={suspendForm} layout="vertical" preserve={false}>
          <Form.Item
            name="reason"
            label="Reason for suspension"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <Input.TextArea rows={3} placeholder="Enter reason for suspension" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
