'use client';

import { Modal, Form, Input, Select, Button, message } from 'antd';

interface DemoRequestModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DemoRequestModal({ open, onClose }: DemoRequestModalProps) {
  const [form] = Form.useForm();

  const handleSubmit = () => {
    form.validateFields().then(() => {
      form.resetFields();
      onClose();
      message.success("Thanks! We'll be in touch within 24 hours.");
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Request a Demo"
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
      width={480}
    >
      <p style={{ color: '#595959', marginBottom: 24 }}>
        Fill in your details and our team will reach out to schedule a
        personalized walkthrough of RentFlow.
      </p>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="name"
          label="Full Name"
          rules={[{ required: true, message: 'Please enter your name' }]}
        >
          <Input placeholder="e.g. James Mwangi" size="large" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="e.g. james@example.com" size="large" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone Number"
          rules={[
            { required: true, message: 'Please enter your phone number' },
            {
              pattern: /^(?:\+254|0)\d{9}$/,
              message: 'Please enter a valid Kenyan phone number',
            },
          ]}
        >
          <Input placeholder="e.g. 0712345678" size="large" />
        </Form.Item>
        <Form.Item
          name="properties"
          label="Number of Properties"
          rules={[{ required: true, message: 'Please select an option' }]}
        >
          <Select placeholder="Select range" size="large">
            <Select.Option value="1-5">1 - 5 properties</Select.Option>
            <Select.Option value="6-20">6 - 20 properties</Select.Option>
            <Select.Option value="21-50">21 - 50 properties</Select.Option>
            <Select.Option value="50+">50+ properties</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="message" label="Message (optional)">
          <Input.TextArea
            rows={3}
            placeholder="Tell us about your property management needs..."
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            size="large"
            block
            onClick={handleSubmit}
            style={{
              background: '#52c41a',
              borderColor: '#52c41a',
              height: 48,
              fontWeight: 600,
            }}
          >
            Request Demo
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
