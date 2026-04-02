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
  Select,
  DatePicker,
  Card,
  App,
  Space,
  Descriptions,
  Grid,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  ToolOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { expensesApi, vendorsApi } from '@/lib/api/expenses.api';
import { propertiesApi } from '@/lib/api/properties.api';
import { parseError } from '@/lib/api/parseError';
import { formatKES } from '@/lib/format-kes';
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseCategory,
  ExpenseStatus,
  ExpensePriority,
  Vendor,
} from '@/types/expenses';
import type { Property } from '@/types/properties';
import type { ColumnsType } from 'antd/es/table';
import { downloadCsv, type CsvColumn } from '@/lib/csv-export';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  in_progress: 'cyan',
  completed: 'green',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  plumbing: 'Plumbing',
  roofing: 'Roofing',
  electrical: 'Electrical',
  painting: 'Painting',
  security: 'Security',
  general_maintenance: 'General Maintenance',
  structural: 'Structural',
  other: 'Other',
};

const VALID_TRANSITIONS: Record<string, { label: string; status: ExpenseStatus; type?: 'primary'; danger?: boolean; color?: string }[]> = {
  pending: [
    { label: 'Approve', status: 'approved', type: 'primary' },
    { label: 'Mark In Progress', status: 'in_progress' },
    { label: 'Mark Completed', status: 'completed', type: 'primary', color: '#52c41a' },
    { label: 'Cancel', status: 'cancelled', danger: true },
  ],
  approved: [
    { label: 'Mark In Progress', status: 'in_progress' },
    { label: 'Mark Completed', status: 'completed', type: 'primary', color: '#52c41a' },
    { label: 'Cancel', status: 'cancelled', danger: true },
  ],
  in_progress: [
    { label: 'Mark Completed', status: 'completed', type: 'primary', color: '#52c41a' },
    { label: 'Cancel', status: 'cancelled', danger: true },
  ],
  completed: [],
  cancelled: [],
};

export default function ExpensesPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [propertyFilter, setPropertyFilter] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { isAuthenticated } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['expenses', statusFilter, categoryFilter, propertyFilter, page, pageSize],
    queryFn: () => expensesApi.getAll({
      status: statusFilter,
      category: categoryFilter,
      propertyId: propertyFilter,
      page,
      limit: pageSize,
    }),
    enabled: isAuthenticated,
  });

  const expenses: Expense[] = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: () => propertiesApi.getAll({ limit: 200 }),
  });

  const propertiesList: Property[] = Array.isArray(propertiesData?.data) ? propertiesData.data : [];

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors', 'all'],
    queryFn: () => vendorsApi.getAll({ limit: 200 }),
    enabled: isModalOpen,
  });

  const vendorsList: Vendor[] = Array.isArray(vendorsData?.data) ? vendorsData.data : [];

  const createMutation = useMutation({
    mutationFn: (values: CreateExpenseInput) => expensesApi.create(values),
    onSuccess: () => {
      message.success('Expense logged successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to create expense'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ expenseId, input }: { expenseId: string; input: UpdateExpenseInput }) =>
      expensesApi.update(expenseId, input),
    onSuccess: () => {
      message.success('Expense updated successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDetailModalOpen(false);
      setSelectedExpense(null);
    },
    onError: (error) => {
      message.error(parseError(error, 'Failed to update expense'));
    },
  });

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload: CreateExpenseInput = {
        propertyId: values.propertyId,
        category: values.category,
        priority: values.priority || undefined,
        description: values.description,
        amount: values.amount,
        vendorId: values.vendorId || undefined,
        scheduledDate: values.scheduledDate?.toISOString(),
        notes: values.notes || undefined,
      };
      createMutation.mutate(payload);
    } catch {
      // validation errors are shown inline by Ant Design
    }
  };

  const handleStatusChange = (newStatus: ExpenseStatus) => {
    if (!selectedExpense) return;
    const input: UpdateExpenseInput = { status: newStatus };
    if (newStatus === 'completed') {
      input.completedDate = new Date().toISOString();
    }
    updateMutation.mutate({ expenseId: selectedExpense.expenseId, input });
  };

  const handleRowClick = (record: Expense) => {
    setSelectedExpense(record);
    setDetailModalOpen(true);
  };

  const columns: ColumnsType<Expense> = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
    },
    {
      title: 'Property',
      key: 'property',
      render: (_: unknown, record: Expense) => record.property?.name || '-',
      sorter: (a, b) => (a.property?.name || '').localeCompare(b.property?.name || ''),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: ExpenseCategory) => (
        <Tag>{CATEGORY_LABEL_MAP[category] || category}</Tag>
      ),
      filters: Object.entries(CATEGORY_LABEL_MAP).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatKES(value),
      sorter: (a, b) => a.amount - b.amount,
      align: 'right',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: ExpensePriority) => (
        <Tag color={PRIORITY_COLOR_MAP[priority] || 'default'}>
          {priority?.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Low', value: 'low' },
        { text: 'Medium', value: 'medium' },
        { text: 'High', value: 'high' },
        { text: 'Urgent', value: 'urgent' },
      ],
      onFilter: (value, record) => record.priority === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ExpenseStatus) => (
        <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
          {STATUS_LABEL_MAP[status] || status}
        </Tag>
      ),
      filters: Object.entries(STATUS_LABEL_MAP).map(([value, text]) => ({ text, value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Vendor',
      key: 'vendor',
      render: (_: unknown, record: Expense) => record.vendor?.name || '-',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
  ];

  const statusActions = selectedExpense ? (VALID_TRANSITIONS[selectedExpense.status] || []) : [];

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
          <ToolOutlined style={{ marginRight: 8 }} />
          Expenses
        </Title>
        <Space>
          <Button
            icon={<ExportOutlined />}
            onClick={async () => {
              setExporting(true);
              try {
                const all = await expensesApi.getAll({ limit: 10000, status: statusFilter, category: categoryFilter, propertyId: propertyFilter });
                const allData: Expense[] = Array.isArray(all?.data) ? all.data : [];
                const csvColumns: CsvColumn<Expense>[] = [
                  { header: 'Description', accessor: (r) => r.description },
                  { header: 'Property', accessor: (r) => r.property?.name || '' },
                  { header: 'Category', accessor: (r) => CATEGORY_LABEL_MAP[r.category] || r.category },
                  { header: 'Amount', accessor: (r) => Number(r.amount) },
                  { header: 'Priority', accessor: (r) => r.priority?.toUpperCase() || '' },
                  { header: 'Status', accessor: (r) => STATUS_LABEL_MAP[r.status] || r.status },
                  { header: 'Vendor', accessor: (r) => r.vendor?.name || '' },
                  { header: 'Date', accessor: (r) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : '' },
                ];
                downloadCsv(allData, csvColumns, 'expenses.csv');
              } finally {
                setExporting(false);
              }
            }}
            loading={exporting}
            disabled={isLoading || expenses.length === 0}
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
            {isMobile ? 'Log' : 'Log Expense'}
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: isMobile ? 8 : 16 }}>
        <Space style={{ width: '100%' }} direction={isMobile ? 'vertical' : 'horizontal'} wrap>
          <Select
            placeholder="Filter by property"
            allowClear
            value={propertyFilter}
            onChange={(value) => { setPropertyFilter(value); setPage(1); }}
            style={{ width: isMobile ? '100%' : 200 }}
            size={isMobile ? 'middle' : 'large'}
            options={propertiesList.map((p) => ({
              label: p.name,
              value: p.propertyId,
            }))}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            style={{ width: isMobile ? '100%' : 160 }}
            size={isMobile ? 'middle' : 'large'}
            options={Object.entries(STATUS_LABEL_MAP).map(([value, label]) => ({
              label,
              value,
            }))}
          />
          <Select
            placeholder="Filter by category"
            allowClear
            value={categoryFilter}
            onChange={(value) => { setCategoryFilter(value); setPage(1); }}
            style={{ width: isMobile ? '100%' : 200 }}
            size={isMobile ? 'middle' : 'large'}
            options={Object.entries(CATEGORY_LABEL_MAP).map(([value, label]) => ({
              label,
              value,
            }))}
          />
        </Space>
      </div>

      {isError && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message="Failed to load expenses"
          description={parseError(error, 'An error occurred while fetching expenses. Check the browser console for details.')}
        />
      )}

      {isMobile ? (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">Loading...</Text></div>
          ) : expenses.length === 0 ? (
            <Card><Text type="secondary">No expenses found.</Text></Card>
          ) : (
            <>
              {expenses.map((expense) => (
                <Card
                  key={expense.expenseId}
                  size="small"
                  style={{ marginBottom: 8, cursor: 'pointer' }}
                  styles={{ body: { padding: '12px 14px' } }}
                  hoverable
                  onClick={() => handleRowClick(expense)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>{expense.description}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{expense.property?.name || '-'}</Text>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 8 }}>
                      <Text strong style={{ fontSize: 14, display: 'block' }}>{formatKES(expense.amount)}</Text>
                      <Tag color={STATUS_COLOR_MAP[expense.status] || 'default'} style={{ margin: 0, fontSize: 10 }}>
                        {STATUS_LABEL_MAP[expense.status] || expense.status}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      <Tag style={{ fontSize: 10, marginRight: 4 }}>{CATEGORY_LABEL_MAP[expense.category] || expense.category}</Tag>
                      <Tag color={PRIORITY_COLOR_MAP[expense.priority] || 'default'} style={{ fontSize: 10, marginRight: 4 }}>
                        {expense.priority?.toUpperCase()}
                      </Tag>
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {expense.createdAt ? dayjs(expense.createdAt).format('DD MMM YYYY') : '-'}
                    </Text>
                  </div>
                </Card>
              ))}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {expenses.length} of {pagination?.total || 0}
                </Text>
                {(pagination?.total || 0) > expenses.length && (
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
          <Table<Expense>
            columns={columns}
            dataSource={expenses}
            loading={isLoading}
            rowKey="expenseId"
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
            pagination={{
              current: page,
              pageSize,
              total: pagination?.total || 0,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} expenses`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
        </Card>
      )}

      {/* Create Expense Modal */}
      <Modal
        title="Log Expense"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending}
        okText="Log Expense"
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="propertyId"
            label="Property"
            rules={[{ required: true, message: 'Please select a property' }]}
          >
            <Select
              placeholder="Select a property"
              showSearch
              optionFilterProp="label"
              options={propertiesList.map((p) => ({
                label: `${p.name} - ${p.location}`,
                value: p.propertyId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              placeholder="Select category"
              options={Object.entries(CATEGORY_LABEL_MAP).map(([value, label]) => ({
                label,
                value,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe the expense..." />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (KES)"
            rules={[{ required: true, message: 'Please enter the amount' }]}
          >
            <InputNumber<number>
              min={0}
              style={{ width: '100%' }}
              placeholder="e.g. 15000"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/,/g, ''))}
            />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Priority"
          >
            <Select
              placeholder="Select priority"
              allowClear
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Urgent', value: 'urgent' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="vendorId"
            label="Vendor (optional)"
          >
            <Select
              placeholder="Select a vendor"
              allowClear
              showSearch
              optionFilterProp="label"
              options={vendorsList.map((v) => ({
                label: `${v.name} (${v.specialty})`,
                value: v.vendorId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="scheduledDate"
            label="Scheduled Date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense Detail Modal */}
      <Modal
        title="Expense Details"
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setSelectedExpense(null); }}
        footer={null}
        width={600}
      >
        {selectedExpense && (
          <div>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Property">
                {selectedExpense.property?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {CATEGORY_LABEL_MAP[selectedExpense.category] || selectedExpense.category}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {selectedExpense.description}
              </Descriptions.Item>
              <Descriptions.Item label="Amount">
                {formatKES(selectedExpense.amount)}
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={PRIORITY_COLOR_MAP[selectedExpense.priority] || 'default'}>
                  {selectedExpense.priority?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR_MAP[selectedExpense.status] || 'default'}>
                  {STATUS_LABEL_MAP[selectedExpense.status] || selectedExpense.status}
                </Tag>
              </Descriptions.Item>
              {selectedExpense.vendor && (
                <Descriptions.Item label="Vendor">
                  {selectedExpense.vendor.name} ({selectedExpense.vendor.specialty})
                </Descriptions.Item>
              )}
              {selectedExpense.scheduledDate && (
                <Descriptions.Item label="Scheduled Date">
                  {dayjs(selectedExpense.scheduledDate).format('DD MMM YYYY')}
                </Descriptions.Item>
              )}
              {selectedExpense.completedDate && (
                <Descriptions.Item label="Completed Date">
                  {dayjs(selectedExpense.completedDate).format('DD MMM YYYY')}
                </Descriptions.Item>
              )}
              {selectedExpense.notes && (
                <Descriptions.Item label="Notes">
                  {selectedExpense.notes}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Created">
                {dayjs(selectedExpense.createdAt).format('DD MMM YYYY, HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {statusActions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {statusActions.map((action) => (
                  <Button
                    key={action.status}
                    type={action.type as 'primary' | undefined}
                    danger={action.danger}
                    style={action.color ? { background: action.color, borderColor: action.color } : undefined}
                    onClick={() => handleStatusChange(action.status)}
                    loading={updateMutation.isPending}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
