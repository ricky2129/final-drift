import React, { useState } from "react";
import { useCreateDriftAssistSecret } from "react-query/integrationQueries";

import { InfoCircleOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { Flex, Form, Select, Tooltip, message, Input as AntInput } from "antd";
import {
  DriftAssistSignInRequest,
  Tag,
} from "interfaces";

import { Drawer, Input, Text } from "components";

import { Colors, Metrics } from "themes";

// AWS Regions
const AWS_REGIONS = [
  { label: "US East (N. Virginia) - us-east-1", value: "us-east-1" },
  { label: "US East (Ohio) - us-east-2", value: "us-east-2" },
  { label: "US West (N. California) - us-west-1", value: "us-west-1" },
  { label: "US West (Oregon) - us-west-2", value: "us-west-2" },
  { label: "Europe (Ireland) - eu-west-1", value: "eu-west-1" },
  { label: "Europe (London) - eu-west-2", value: "eu-west-2" },
  { label: "Europe (Frankfurt) - eu-central-1", value: "eu-central-1" },
  { label: "Asia Pacific (Singapore) - ap-southeast-1", value: "ap-southeast-1" },
  { label: "Asia Pacific (Sydney) - ap-southeast-2", value: "ap-southeast-2" },
  { label: "Asia Pacific (Tokyo) - ap-northeast-1", value: "ap-northeast-1" },
];

interface DriftAssistSignInFormFields {
  name: string;
  aws_access_key: string;
  aws_secret_key: string;
  aws_region: string;
}

interface DriftAssistSignInDrawerProps {
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * A Drawer component for adding DriftAssist account to a project.
 */
const DriftAssistSignInDrawer: React.FC<DriftAssistSignInDrawerProps> = ({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [disabledSave, setDisabledSave] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [driftAssistForm] = Form.useForm<DriftAssistSignInFormFields>();

  const createDriftAssistSecretQuery = useCreateDriftAssistSecret();

  const [messageApi, contextHolder] = message.useMessage();

  const error = (message?: string) => {
    messageApi.open({
      type: "error",
      content: message ? message : "Error: Something went wrong",
    });
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      await driftAssistForm.validateFields();

      const req: DriftAssistSignInRequest = {
        name: driftAssistForm.getFieldValue("name"),
        project_id: projectId,
        secret: {
          cloud_provider: "aws",
          access_key: driftAssistForm.getFieldValue("aws_access_key"),
          secret_access_key: driftAssistForm.getFieldValue("aws_secret_key"),
          region: driftAssistForm.getFieldValue("aws_region"),
        },
        access: "Internal",
        tags: [],
      };

      await createDriftAssistSecretQuery.mutateAsync(req);
      onSuccess();
    } catch (err) {
      error(err?.response?.data?.detail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = () => {
    const hasErrors =
      driftAssistForm?.getFieldsError().filter(({ errors }) => errors.length)
        .length > 0;

    setDisabledSave(hasErrors);
  };

  return (
    <>
      {contextHolder}
      <Drawer
        open={isOpen}
        onClose={onClose}
        title="Add New DriftAssist Account"
        onCancel={onClose}
        onSubmit={handleSubmit}
        disabled={disabledSave || isLoading}
        loading={isLoading}
      >
        <Form
          layout="vertical"
          onFieldsChange={handleFormChange}
          form={driftAssistForm}
          initialValues={{
            aws_region: "us-east-1",
          }}
        >
          <Form.Item<DriftAssistSignInFormFields>
            name="name"
            label={<Text weight="semibold" text="Account Name" />}
            rules={[{ required: true, message: "Account name is required" }]}
          >
            <Input placeholder="Enter account name" />
          </Form.Item>

          <Form.Item<DriftAssistSignInFormFields>
            name="aws_access_key"
            label={
              <Flex align="center" gap={Metrics.SPACE_XS}>
                <Text weight="semibold" text="AWS Access Key" />
                <Tooltip
                  overlayStyle={{ maxWidth: "400px" }}
                  showArrow
                  title={
                    <>
                      Your AWS Access Key ID. This should start with "AKIA" and be 20 characters long.
                      <br />
                      <a
                        href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn more about AWS Access Keys
                      </a>
                    </>
                  }
                  trigger="hover"
                  placement="bottom"
                >
                  <InfoCircleOutlined
                    className="cursor-pointer"
                    style={{ color: Colors.COOL_GRAY_7 }}
                  />
                </Tooltip>
              </Flex>
            }
            rules={[
              { required: true, message: "AWS Access Key is required" },
              { pattern: /^AKIA[0-9A-Z]{16}$/, message: "Invalid AWS Access Key format (should start with AKIA)" }
            ]}
          >
            <Input
              placeholder="AKIA..."
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item<DriftAssistSignInFormFields>
            name="aws_secret_key"
            label={
              <Flex align="center" gap={Metrics.SPACE_XS}>
                <Text weight="semibold" text="AWS Secret Key" />
                <Tooltip
                  overlayStyle={{ maxWidth: "400px" }}
                  showArrow
                  title={
                    <>
                      Your AWS Secret Access Key. This should be 40 characters long.
                      <br />
                      <a
                        href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn more about AWS Access Keys
                      </a>
                    </>
                  }
                  trigger="hover"
                  placement="bottom"
                >
                  <InfoCircleOutlined
                    className="cursor-pointer"
                    style={{ color: Colors.COOL_GRAY_7 }}
                  />
                </Tooltip>
              </Flex>
            }
            rules={[
              { required: true, message: "AWS Secret Key is required" },
              { len: 40, message: "AWS Secret Key should be exactly 40 characters long" }
            ]}
          >
            <AntInput.Password
              placeholder="Enter your AWS Secret Access Key"
              autoComplete="off"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item<DriftAssistSignInFormFields>
            name="aws_region"
            label={<Text weight="semibold" text="AWS Region" />}
            rules={[{ required: true, message: "AWS region is required" }]}
          >
            <Select
              placeholder="Select AWS region"
              options={AWS_REGIONS}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>

        {/* Security Notice */}
        <div style={{ marginTop: 24, padding: '12px', background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
          <Text 
            text="🔒 Security Notice: Your credentials are securely stored in AWS Secrets Manager and encrypted at rest." 
            type="footnote" 
            style={{ color: '#0066cc' }}
          />
        </div>
      </Drawer>
    </>
  );
};

export default DriftAssistSignInDrawer;
