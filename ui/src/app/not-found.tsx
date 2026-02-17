"use client";

import { Button, Result } from "antd";
import { ArrowLeftOutlined, HomeOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '48px 16px',
    }}>
      <Result
        status="404"
        title="404"
        subTitle="The page you're looking for doesn't exist."
        extra={[
          <Button
            key="back"
            icon={<ArrowLeftOutlined />}
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>,
          <Link key="home" href="/dashboard">
            <Button type="primary" icon={<HomeOutlined />}>
              Home
            </Button>
          </Link>,
        ]}
      />
    </div>
  );
}
