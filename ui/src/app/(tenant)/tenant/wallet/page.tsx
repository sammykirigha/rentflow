"use client";

import { walletApi } from "@/lib/api/payments.api";
import { mpesaApi } from "@/lib/api/mpesa.api";
import { formatKES } from "@/lib/format-kes";
import { getMpesaErrorMessage, isValidKenyanPhone } from "@/lib/mpesa-errors";
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
  DownloadOutlined,
  ExportOutlined,
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
  DatePicker,
  Popover,
  Grid,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { downloadCsv, type CsvColumn } from "@/lib/csv-export";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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

const { RangePicker } = DatePicker;

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
  const [statementDates, setStatementDates] = useState<[string?, string?]>([]);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [statementPopoverOpen, setStatementPopoverOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form] = Form.useForm();
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
            setStkError(getMpesaErrorMessage(result.resultCode, result.resultDesc));
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
    } catch (err: unknown) {
      setStkState("failed");
      const error = err as Record<string, unknown>;
      const axiosError = error?.response as Record<string, unknown> | undefined;
      const axiosData = axiosError?.data as Record<string, unknown> | undefined;
      const nestedError = axiosData?.error as Record<string, unknown> | undefined;
      const rawMsg =
        (axiosData?.message as string) ||
        (nestedError?.message as string) ||
        "";
      setStkError(getMpesaErrorMessage(undefined, rawMsg));
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

  const handleDownloadStatement = async () => {
    try {
      setDownloadingStatement(true);
      await walletApi.downloadMyStatement({
        startDate: statementDates[0] || undefined,
        endDate: statementDates[1] || undefined,
      });
      setStatementPopoverOpen(false);
      message.success("Statement downloaded");
    } catch {
      message.error("Failed to download statement");
    } finally {
      setDownloadingStatement(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const all = await walletApi.getMyTransactions({ limit: 10000 });
      const allData: WalletTransaction[] = Array.isArray(all?.data) ? all.data : [];
      const csvColumns: CsvColumn<WalletTransaction>[] = [
        { header: 'Date', accessor: (r) => new Date(r.createdAt).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
        { header: 'Type', accessor: (r) => txnTypeLabels[r.type] || r.type },
        { header: 'Amount', accessor: (r) => Number(r.amount) },
        { header: 'Balance After', accessor: (r) => Number(r.balanceAfter) },
        { header: 'Reference', accessor: (r) => r.reference || '' },
        { header: 'Description', accessor: (r) => r.description || '' },
      ];
      downloadCsv(allData, csvColumns, 'my-wallet.csv');
    } finally {
      setExporting(false);
    }
  };

  const statementPopoverContent = (
    <div style={{ width: isMobile ? 240 : 280 }}>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        Select a date range (optional):
      </Typography.Text>
      <RangePicker
        style={{ width: "100%", marginBottom: 12 }}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            setStatementDates([
              dates[0].format("YYYY-MM-DD"),
              dates[1].format("YYYY-MM-DD"),
            ]);
          } else {
            setStatementDates([]);
          }
        }}
      />
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        block
        loading={downloadingStatement}
        onClick={handleDownloadStatement}
      >
        Download PDF
      </Button>
    </div>
  );

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
              help="Leave blank to use your registered number. Formats: 0712345678 or +254712345678"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    if (isValidKenyanPhone(value)) return Promise.resolve();
                    return Promise.reject('Enter a valid Kenyan phone number (e.g. 0712345678)');
                  },
                },
              ]}
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
          <div style={{ textAlign: "center", padding: isMobile ? "24px 0" : "40px 0" }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} />} />
            <Title level={4} style={{ marginTop: 24 }}>
              Initiating M-Pesa payment...
            </Title>
            <Text type="secondary">Please wait while we send the payment request to your phone.</Text>
          </div>
        );

      case "waiting":
        return (
          <div style={{ textAlign: "center", padding: isMobile ? "24px 0" : "40px 0" }}>
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

  const isCredit = (type: WalletTxnType) =>
    type === WalletTxnType.CREDIT ||
    type === WalletTxnType.CREDIT_RECONCILIATION ||
    type === WalletTxnType.REFUND;

  const renderMobileTxnCard = (txn: WalletTransaction) => (
    <Card
      key={txn.walletTransactionId}
      size="small"
      style={{ marginBottom: 8 }}
      styles={{ body: { padding: '10px 14px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <Tag color={txnTypeColors[txn.type]} style={{ margin: '0 0 4px 0' }}>
            {txnTypeLabels[txn.type]}
          </Tag>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
            {new Date(txn.createdAt).toLocaleDateString("en-KE", {
              year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </Text>
        </div>
        <Text strong style={{
          fontSize: 16,
          color: isCredit(txn.type) ? '#52c41a' : '#ff4d4f',
        }}>
          {isCredit(txn.type) ? '+' : '-'}{formatKES(Number(txn.amount))}
        </Text>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {txn.reference || txn.description || '—'}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Bal: {formatKES(Number(txn.balanceAfter))}
        </Text>
      </div>
    </Card>
  );

  return (
    <div>
      <Title level={isMobile ? 5 : 3} style={{ marginBottom: isMobile ? 12 : undefined }}>My Wallet</Title>

      {/* Balance card */}
      <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
        {isMobile ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Statistic
                title="Current Balance"
                value={balance}
                prefix={<WalletOutlined />}
                formatter={(val) => formatKES(Number(val))}
              />
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              size="large"
              onClick={() => setTopupModalOpen(true)}
              style={{ marginBottom: 8 }}
            >
              Top Up via M-Pesa
            </Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                icon={<ExportOutlined />}
                block
                onClick={handleExportCsv}
                loading={exporting}
                disabled={loading || transactions.length === 0}
              >
                CSV
              </Button>
              <Popover
                content={statementPopoverContent}
                title="Download Wallet Statement"
                trigger="click"
                open={statementPopoverOpen}
                onOpenChange={setStatementPopoverOpen}
              >
                <Button icon={<DownloadOutlined />} block>
                  Statement
                </Button>
              </Popover>
            </div>
          </div>
        ) : (
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
            <Button
              icon={<ExportOutlined />}
              size="large"
              onClick={handleExportCsv}
              loading={exporting}
              disabled={loading || transactions.length === 0}
            >
              Export CSV
            </Button>
            <Popover
              content={statementPopoverContent}
              title="Download Wallet Statement"
              trigger="click"
              open={statementPopoverOpen}
              onOpenChange={setStatementPopoverOpen}
            >
              <Button icon={<DownloadOutlined />} size="large">
                Download Statement
              </Button>
            </Popover>
          </Space>
        )}
      </Card>

      {/* Transactions */}
      {isMobile ? (
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>Transaction History</Title>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : transactions.length === 0 ? (
            <Card><Text type="secondary">No transactions yet</Text></Card>
          ) : (
            <>
              {transactions.map(renderMobileTxnCard)}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {transactions.length} of {pagination.total} transactions
                </Text>
                {pagination.total > transactions.length && (
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      onClick={() => fetchTransactions(1, pagination.limit + 10)}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
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
      )}

      <Modal
        title={stkState === "idle" ? "Top Up Wallet via M-Pesa" : undefined}
        open={topupModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        closable={stkState !== "initiating" && stkState !== "waiting"}
        maskClosable={stkState === "idle" || stkState === "success" || stkState === "failed" || stkState === "timeout"}
        width={isMobile ? '95vw' : undefined}
        centered={isMobile}
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
