"use client";

import { Button, Result } from "antd";
import { ArrowLeftOutlined, HomeOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function NotFound() {
  return (
    <Result
      status="404"
      title="Page Not Found"
      subTitle="The page you're looking for doesn't exist or has been moved."
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
            Dashboard
          </Button>
        </Link>,
      ]}
    />
  );
}
