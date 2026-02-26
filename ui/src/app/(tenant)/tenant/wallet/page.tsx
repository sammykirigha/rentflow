"use client";

import { walletApi } from "@/lib/api/payments.api";
import { mpesaApi } from "@/lib/api/mpesa.api";
import { formatKES } from "@/lib/format-kes";
import { WalletTransaction, WalletTxnType, PaymentStatus } from "@/types/payments";
import {
  WalletOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
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
  Result,
  Spin,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

const { Title, Text } = Typography;

const txnTypeLabels: Record<WalletTxnType, string> = {
  [WalletTxnType.CREDIT]: "Top-Up",
  [WalletTxnType.CREDIT_RECONCILIATION]: "Reconciled Payment",
  [WalletTxnType.DEBIT_INVOICE]: "Invoice Payment",
  [WalletTxnType.DEBIT_PENALTY]: "Penalty Deduction",
  [WalletTxnType.REFUND]: "Refund",
};

const txnTypeColors: Record<WalletTxnType, string> = {
  [WalletTxnType.CREDIT]: "green",
  [WalletTxnType.CREDIT_RECONCILIATION]: "cyan",
  [WalletTxnType.DEBIT_INVOICE]: "red",
  [WalletTxnType.DEBIT_PENALTY]: "orange",
  [WalletTxnType.REFUND]: "blue",
};

type StkModalState = "idle" | "initiating" | "waiting" | "success" | "failed" | "timeout";

const MAX_POLLS = 10;
const POLL_INTERVAL_MS = 3000;

export default function TenantWalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [stkState, setStkState] = useState<StkModalState>("idle");
  const [stkError, setStkError] = useState<string>("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [form] = Form.useForm();
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  const pollStkStatus = useCallback(
    (paymentId: string, attempt: number) => {
      if (attempt >= MAX_POLLS) {
        setStkState("timeout");
        return;
      }

      pollTimerRef.current = setTimeout(async () => {
        try {
          const result = await mpesaApi.checkStkStatus(paymentId);

          if (result.status === PaymentStatus.COMPLETED) {
            setStkState("success");
            fetchBalance();
            fetchTransactions(1, pagination.limit);
            return;
          }

          if (result.status === PaymentStatus.FAILED) {
            setStkState("failed");
            setStkError(result.resultDesc || "Payment was not completed. Please try again.");
            return;
          }

          // Still pending — continue polling
          pollStkStatus(paymentId, attempt + 1);
        } catch {
          // Network error — continue polling
          pollStkStatus(paymentId, attempt + 1);
        }
      }, POLL_INTERVAL_MS);
    },
    [fetchBalance, fetchTransactions, pagination.limit],
  );

  const handleStkPush = async (values: { amount: number; phoneNumber?: string }) => {
    try {
      setStkState("initiating");
      setStkError("");

      const result = await mpesaApi.initiateStkPush({
        amount: values.amount,
        phoneNumber: values.phoneNumber || undefined,
      });

      setStkState("waiting");

      // Start polling for payment status
      pollStkStatus(result.paymentId, 0);
    } catch (err: any) {
      setStkState("failed");
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        "Failed to initiate M-Pesa payment. Please try again.";
      setStkError(errorMsg);
    }
  };

  const handleCloseModal = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setTopupModalOpen(false);
    setStkState("idle");
    setStkError("");
    form.resetFields();
  };

  const renderModalContent = () => {
    switch (stkState) {
      case "idle":
        return (
          <Form form={form} layout="vertical" onFinish={handleStkPush}>
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
              name="phoneNumber"
              label="M-Pesa Phone Number (Optional)"
              help="Leave blank to use your registered phone number"
            >
              <Input placeholder="e.g. 0712345678" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block icon={<MobileOutlined />}>
                Pay via M-Pesa
              </Button>
            </Form.Item>
          </Form>
        );

      case "initiating":
        return (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} />} />
            <Title level={4} style={{ marginTop: 24 }}>
              Initiating M-Pesa payment...
            </Title>
            <Text type="secondary">Please wait while we send the payment request to your phone.</Text>
          </div>
        );

      case "waiting":
        return (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <MobileOutlined style={{ fontSize: 64, color: "#52c41a" }} />
            <Title level={4} style={{ marginTop: 24 }}>
              Check your phone
            </Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              An M-Pesa payment prompt has been sent to your phone. Please enter your M-Pesa PIN to
              complete the payment.
            </Text>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} />} />
            <br />
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
              Waiting for confirmation...
            </Text>
          </div>
        );

      case "success":
        return (
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="Payment Successful"
            subTitle="Your wallet has been topped up successfully via M-Pesa."
            extra={[
              <Button key="close" type="primary" onClick={handleCloseModal}>
                Done
              </Button>,
            ]}
          />
        );

      case "failed":
        return (
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="Payment Failed"
            subTitle={stkError || "The M-Pesa payment was not completed."}
            extra={[
              <Button
                key="retry"
                type="primary"
                onClick={() => {
                  setStkState("idle");
                  setStkError("");
                }}
              >
                Try Again
              </Button>,
              <Button key="close" onClick={handleCloseModal}>
                Close
              </Button>,
            ]}
          />
        );

      case "timeout":
        return (
          <Result
            status="warning"
            title="Payment Processing"
            subTitle="Your payment may still be processing. If money was deducted from your M-Pesa, your wallet will be updated shortly."
            extra={[
              <Button key="close" type="primary" onClick={handleCloseModal}>
                Close
              </Button>,
            ]}
          />
        );
    }
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) =>
        new Date(date).toLocaleDateString("en-KE", {
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
      render: (type: WalletTxnType) => <Tag color={txnTypeColors[type]}>{txnTypeLabels[type]}</Tag>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: WalletTransaction) => {
        const isCredit =
          record.type === WalletTxnType.CREDIT ||
          record.type === WalletTxnType.CREDIT_RECONCILIATION ||
          record.type === WalletTxnType.REFUND;
        return (
          <span style={{ color: isCredit ? "#52c41a" : "#ff4d4f", fontWeight: 600 }}>
            {isCredit ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {formatKES(Number(amount))}
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
            Top Up via M-Pesa
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
        title={stkState === "idle" ? "Top Up Wallet via M-Pesa" : undefined}
        open={topupModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        closable={stkState !== "initiating" && stkState !== "waiting"}
        maskClosable={stkState === "idle" || stkState === "success" || stkState === "failed" || stkState === "timeout"}
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
