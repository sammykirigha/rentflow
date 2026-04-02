'use client';

import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { uploadImage } from '@/lib/api/upload.api';
import { getCurrentOrganization, updateCurrentOrganization } from '@/lib/api/organizations.api';
import { getFileUrl } from '@/lib/utils';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { App, Button, Card, ColorPicker, Form, Input, Spin, Upload } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

interface ImageUploadCardProps {
  label: string;
  description: string;
  currentKey?: string;
  settingKey: 'appLogo' | 'appFavicon';
}

function ImageUploadCard({ label, description, currentKey, settingKey }: ImageUploadCardProps) {
  const updateSettings = useUpdateSettings();
  const { message: messageApi } = App.useApp();
  const [uploading, setUploading] = useState(false);

  const beforeUpload = (file: RcFile) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      messageApi.error('Only PNG, JPEG, and SVG files are allowed');
      return false;
    }
    if (file.size > MAX_SIZE) {
      messageApi.error('File must be smaller than 2MB');
      return false;
    }
    return true;
  };

  const handleUpload = async (file: RcFile) => {
    setUploading(true);
    try {
      const result = await uploadImage(file);
      if (result?.key) {
        await updateSettings.mutateAsync({ [settingKey]: result.key });
        messageApi.success(`${label} updated successfully`);
      } else {
        messageApi.error('Upload failed');
      }
    } catch {
      messageApi.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await updateSettings.mutateAsync({ [settingKey]: null as unknown as string });
      messageApi.success(`${label} removed`);
    } catch {
      messageApi.error('Failed to remove');
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
        <div
          style={{
            width: 120,
            height: 120,
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: '#fafafa',
            flexShrink: 0,
          }}
        >
          {currentKey ? (
            <img
              src={getFileUrl(currentKey)}
              alt={label}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ color: '#bbb', fontSize: 13 }}>No image</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>{description}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Upload
              accept={ACCEPTED_TYPES.join(',')}
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={({ file }) => handleUpload(file as RcFile)}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                {currentKey ? 'Change' : 'Upload'}
              </Button>
            </Upload>
            {currentKey && (
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={handleRemove}
                loading={updateSettings.isPending}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function BrandingTab() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: getCurrentOrganization,
    staleTime: 5 * 60 * 1000,
  });

  const updateOrg = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateCurrentOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'current'] });
      messageApi.success('Branding updated successfully');
    },
    onError: () => {
      messageApi.error('Failed to update branding');
    },
  });

  useEffect(() => {
    if (org) {
      form.setFieldsValue({
        primaryColor: org.primaryColor || '#1890ff',
        tagline: org.tagline || '',
      });
    }
  }, [org, form]);

  const handleBrandingSave = () => {
    const values = form.getFieldsValue();
    const color = typeof values.primaryColor === 'string'
      ? values.primaryColor
      : values.primaryColor?.toHexString?.() || '#1890ff';
    updateOrg.mutate({
      primaryColor: color,
      tagline: values.tagline || null,
    });
  };

  if (settingsLoading || orgLoading) {
    return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Branding</div>
        <div style={{ color: '#666', fontSize: 13 }}>
          Customize your company logo, colors, and tagline. These will appear on all generated invoices, receipts, and statements.
        </div>
      </div>

      <ImageUploadCard
        label="Logo"
        description="Your company logo. Recommended size: 200x200px. Max 2MB. PNG, JPEG, or SVG."
        currentKey={settings?.appLogo}
        settingKey="appLogo"
      />

      <ImageUploadCard
        label="Favicon"
        description="Browser tab icon. Recommended size: 32x32px. Max 2MB. PNG, JPEG, or SVG."
        currentKey={settings?.appFavicon}
        settingKey="appFavicon"
      />

      <Card title="Document Branding" style={{ marginTop: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="Primary Color"
            name="primaryColor"
            help="Used as the accent color on invoices, receipts, and statements."
          >
            <ColorPicker
              showText
              defaultValue="#1890ff"
            />
          </Form.Item>

          <Form.Item
            label="Tagline"
            name="tagline"
            help="A short tagline displayed under your company name on documents."
          >
            <Input placeholder="e.g. Professional Property Management" maxLength={200} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: typeof form.getFieldValue('primaryColor') === 'string'
                  ? form.getFieldValue('primaryColor')
                  : '#1890ff',
                border: '1px solid #d9d9d9',
              }}
            />
            <Button
              type="primary"
              onClick={handleBrandingSave}
              loading={updateOrg.isPending}
            >
              Save Branding
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
