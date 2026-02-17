"use client";

import { walletApi } from "@/lib/api/payments.api";
import { formatKES } from "@/lib/format-kes";
import { WalletTransaction, WalletTxnType } from "@/types/payments";
import {
  WalletOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  Tag,
  Typography,
  Statistic,
  Space,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";

const { Title } = Typography;

const txnTypeLabels: Record<WalletTxnType, string> = {
  [WalletTxnType.CREDIT]: "Top-Up",
  [WalletTxnType.DEBIT_INVOICE]: "Invoice Payment",
  [WalletTxnType.DEBIT_PENALTY]: "Penalty Deduction",
  [WalletTxnType.REFUND]: "Refund",
};

const txnTypeColors: Record<WalletTxnType, string> = {
  [WalletTxnType.CREDIT]: "green",
  [WalletTxnType.DEBIT_INVOICE]: "red",
  [WalletTxnType.DEBIT_PENALTY]: "orange",
  [WalletTxnType.REFUND]: "blue",
};

export default function TenantWalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [form] = Form.useForm();

  const fetchBalance = useCallback(async () => {
    try {
      const data = await walletApi.getMyBalance();
      setBalance(data.walletBalance);
    } catch {
      // silently handle - balance may show 0
    }
  }, []);

  const fetchTransactions = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const data = await walletApi.getMyTransactions({ page, limit });
      setTransactions(data?.data || []);
      setPagination({
        page: data?.pagination?.page || page,
        limit: data?.pagination?.limit || limit,
        total: data?.pagination?.total || 0,
      });
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, [fetchBalance, fetchTransactions]);

  const handleTopup = async (values: { amount: number; mpesaReceiptNumber?: string }) => {
    try {
      setTopupLoading(true);
      const result = await walletApi.topup({
        amount: values.amount,
        mpesaReceiptNumber: values.mpesaReceiptNumber || undefined,
      });
      setBalance(result.walletBalance);
      message.success(`Wallet topped up with ${formatKES(values.amount)}`);
      setTopupModalOpen(false);
      form.resetFields();
      fetchTransactions(1, pagination.limit);
    } catch {
      message.error("Failed to top up wallet. Please try again.");
    } finally {
      setTopupLoading(false);
    }
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: WalletTxnType) => (
        <Tag color={txnTypeColors[type]}>{txnTypeLabels[type]}</Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: WalletTransaction) => {
        const isCredit = record.type === WalletTxnType.CREDIT || record.type === WalletTxnType.REFUND;
        return (
          <span style={{ color: isCredit ? "#52c41a" : "#ff4d4f", fontWeight: 600 }}>
            {isCredit ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}
            {formatKES(Number(amount))}
          </span>
        );
      },
    },
    {
      title: "Balance After",
      dataIndex: "balanceAfter",
      key: "balanceAfter",
      render: (val: number) => formatKES(Number(val)),
    },
    {
      title: "Reference",
      dataIndex: "reference",
      key: "reference",
      render: (ref: string) => ref || "—",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc: string) => desc || "—",
    },
  ];

  return (
    <div>
      <Title level={3}>My Wallet</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space size="large" align="start">
          <Statistic
            title="Current Balance"
            value={balance}
            prefix={<WalletOutlined />}
            formatter={(val) => formatKES(Number(val))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setTopupModalOpen(true)}
          >
            Top Up Wallet
          </Button>
        </Space>
      </Card>

      <Card title="Transaction History">
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="walletTransactionId"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} transactions`,
            onChange: (page, pageSize) => fetchTransactions(page, pageSize),
          }}
        />
      </Card>

      <Modal
        title="Top Up Wallet"
        open={topupModalOpen}
        onCancel={() => {
          setTopupModalOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleTopup}
        >
          <Form.Item
            name="amount"
            label="Amount (KES)"
            rules={[
              { required: true, message: "Please enter amount" },
              { type: "number", min: 1, message: "Minimum amount is KES 1" },
              { type: "number", max: 500000, message: "Maximum amount is KES 500,000" },
            ]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              placeholder="Enter amount"
              min={1}
              max={500000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => Number(value?.replace(/,/g, "") || 0)}
            />
          </Form.Item>
          <Form.Item
            name="mpesaReceiptNumber"
            label="M-Pesa Receipt Number (Optional)"
          >
            <Input placeholder="e.g. QJK3ABCDEF" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={topupLoading}
              block
            >
              Top Up
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
