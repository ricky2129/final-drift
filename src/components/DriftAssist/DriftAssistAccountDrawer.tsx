import React, { useState, useEffect } from "react";
import { Form, FormInstance, Button, message, Flex, Select, Input as AntInput, Divider, Card, Typography } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, PlusOutlined, CloudOutlined } from "@ant-design/icons";
import { Input, Text } from "components";
import { Metrics } from "themes";
import { useParams } from "react-router-dom";
import { 
  useCreateDriftAssistSecret,
  useGetDriftAssistIntegrationsByProjectId,
  useGetDriftAssistSecret
} from "react-query/integrationQueries";
import { 
  useConnectToAWS,
  type ConnectAWSRequest
} from "react-query/driftAssistQueries";
import { DriftAssistSignInRequest } from "interfaces";

const { Title } = Typography;

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

interface DriftAssistAccountFormField {
  selectedAccount?: string;
  accountName?: string;
  cloudProvider: string;
  awsAccessKey: string;
  awsSecretKey: string;
  awsRegion: string;
}

interface DriftAssistAccountDrawerProps {
  form: FormInstance<DriftAssistAccountFormField>;
  setDisabledSave: (disabled: boolean) => void;
  onFinish?: () => void;
  onSuccess?: () => void;
}

const DriftAssistAccountDrawer: React.FC<DriftAssistAccountDrawerProps> = ({
  form,
  setDisabledSave,
  onFinish,
  onSuccess,
}) => {
  const { project } = useParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // API hooks
  const createDriftAssistSecretMutation = useCreateDriftAssistSecret();
  const getDriftAssistSecretMutation = useGetDriftAssistSecret();
  const connectToAWSMutation = useConnectToAWS();
  
  // Get existing accounts
  const { data: existingAccounts, refetch: refetchAccounts } = useGetDriftAssistIntegrationsByProjectId(
    project || ""
  );

  // Form validation
  useEffect(() => {
    const hasErrors = form
      ?.getFieldsError()
      .filter(({ errors }) => errors.length).length > 0;
    setDisabledSave(hasErrors);
  }, [form, setDisabledSave]);

  // Initialize form with defaults
  useEffect(() => {
    form.setFieldsValue({
      cloudProvider: 'aws',
      awsRegion: 'us-east-1'
    });
  }, [form]);

  const handleAccountSelection = async (accountId: string) => {
    if (accountId === 'create_new') {
      setShowCreateForm(true);
      setSelectedAccountId(null);
      form.setFieldValue('selectedAccount', undefined);
    } else {
      setShowCreateForm(false);
      setSelectedAccountId(accountId);
      form.setFieldValue('selectedAccount', accountId);
    }
  };

  const handleCreateAccount = async () => {
    try {
      console.log('🔧 DriftAssistAccountDrawer: Creating new account...');
      
      const values = await form.validateFields([
        'accountName',
        'cloudProvider', 
        'awsAccessKey',
        'awsSecretKey',
        'awsRegion'
      ]);
      
      const createRequest: DriftAssistSignInRequest = {
        name: values.accountName,
        project_id: parseInt(project || "0"),
        secret: {
          cloud_provider: values.cloudProvider,
          access_key: values.awsAccessKey,
          secret_access_key: values.awsSecretKey,
          region: values.awsRegion,
        },
        access: "Internal",
        tags: [],
      };

      console.log('🌐 DriftAssistAccountDrawer: Creating account with request:', {
        name: createRequest.name,
        projectId: createRequest.project_id,
        provider: createRequest.secret.cloud_provider,
        region: createRequest.secret.region
      });

      const response = await createDriftAssistSecretMutation.mutateAsync(createRequest);
      
      console.log('✅ DriftAssistAccountDrawer: Account created successfully:', response);
      
      message.success(`Account "${values.accountName}" created successfully!`);
      
      // Refetch accounts to update the dropdown
      await refetchAccounts();
      
      // Select the newly created account
      setSelectedAccountId(response.id.toString());
      form.setFieldValue('selectedAccount', response.id.toString());
      setShowCreateForm(false);
      
    } catch (error) {
      console.error('❌ DriftAssistAccountDrawer: Failed to create account:', error);
      message.error(error instanceof Error ? error.message : 'Failed to create account');
    }
  };

  const handleConnectToAWS = async () => {
    try {
      console.log('🔧 DriftAssistAccountDrawer: Starting AWS connection process...');
      
      if (!selectedAccountId) {
        message.error('Please select an account first');
        return;
      }

      // Get the account credentials
      const accountCredentials = await getDriftAssistSecretMutation.mutateAsync(selectedAccountId);
      
      console.log('📝 DriftAssistAccountDrawer: Retrieved account credentials');
      
      const connectRequest: ConnectAWSRequest = {
        provider: accountCredentials.cloud_provider,
        credentials: {
          access_key: accountCredentials.access_key,
          secret_key: accountCredentials.secret_access_key,
        },
        region: accountCredentials.region,
      };

      console.log('🌐 DriftAssistAccountDrawer: Connecting to AWS with stored credentials');

      const response = await connectToAWSMutation.mutateAsync(connectRequest);
      
      console.log('✅ DriftAssistAccountDrawer: AWS connection successful!');
      
      // Store session data
      const sessionData = {
        sessionId: response.session_id,
        accountId: selectedAccountId,
        awsCredentials: {
          region: accountCredentials.region,
          provider: accountCredentials.cloud_provider,
          access_key: accountCredentials.access_key,
          secret_key: accountCredentials.secret_access_key
        },
        timestamp: Date.now()
      };
      
      try {
        sessionStorage.setItem('driftAssistSession', JSON.stringify(sessionData));
        console.log('✅ DriftAssistAccountDrawer: Saved session data to storage');
      } catch (error) {
        console.error('❌ DriftAssistAccountDrawer: Failed to save session to storage:', error);
      }
      
      message.success('Successfully connected to AWS!');
      
      if (onSuccess) onSuccess();
      if (onFinish) onFinish();
      
    } catch (error) {
      console.error('❌ DriftAssistAccountDrawer: AWS connection failed:', error);
      message.error(error instanceof Error ? error.message : 'Failed to connect to AWS');
    }
  };

  const accountOptions = [
    ...(existingAccounts?.map(account => ({
      label: account.name,
      value: account.id.toString(),
    })) || []),
    {
      label: (
        <Flex align="center" gap={8}>
          <PlusOutlined />
          <span>Create New Account</span>
        </Flex>
      ),
      value: 'create_new',
    }
  ];

  return (
    <Flex vertical gap={Metrics.SPACE_LG}>
      <div>
        <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
          <CloudOutlined style={{ marginRight: 8 }} />
          Drift Assist Account Management
        </Title>
        <Text 
          text="Select an existing account or create a new one to connect to AWS for drift analysis." 
          type="footnote" 
          style={{ color: '#666' }}
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ 
          cloudProvider: 'aws', 
          awsRegion: 'us-east-1'
        }}
      >
        {/* Account Selection */}
        <Card title="Select Account" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            label={<Text text="AWS Account" weight="semibold" />}
            name="selectedAccount"
            rules={[{ required: !showCreateForm, message: 'Please select an account' }]}
          >
            <Select
              placeholder="Select an existing account or create new"
              options={accountOptions}
              onChange={handleAccountSelection}
              loading={!existingAccounts}
            />
          </Form.Item>
        </Card>

        {/* Create New Account Form */}
        {showCreateForm && (
          <Card title="Create New Account" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              label={<Text text="Account Name" weight="semibold" />}
              name="accountName"
              rules={[
                { required: true, message: 'Account name is required' },
                { min: 3, message: 'Account name must be at least 3 characters' }
              ]}
            >
              <Input
                placeholder="Enter a name for this account (e.g., Production AWS)"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              label={<Text text="Cloud Provider" weight="semibold" />}
              name="cloudProvider"
              rules={[{ required: true, message: 'Cloud provider is required' }]}
            >
              <Select
                placeholder="Select cloud provider"
                options={[{ label: "Amazon Web Services (AWS)", value: "aws" }]}
              />
            </Form.Item>

            <Form.Item
              label={<Text text="AWS Access Key" weight="semibold" />}
              name="awsAccessKey"
              rules={[
                { required: true, message: 'AWS Access Key is required' },
                { pattern: /^AKIA[0-9A-Z]{16}$/, message: 'Invalid AWS Access Key format (should start with AKIA)' }
              ]}
            >
              <Input
                placeholder="AKIA..."
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              label={<Text text="AWS Secret Key" weight="semibold" />}
              name="awsSecretKey"
              rules={[
                { required: true, message: 'AWS Secret Key is required' },
                { len: 40, message: 'AWS Secret Key should be exactly 40 characters long' }
              ]}
            >
              <AntInput.Password
                placeholder="Enter your AWS Secret Access Key"
                autoComplete="off"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              label={<Text text="AWS Region" weight="semibold" />}
              name="awsRegion"
              rules={[{ required: true, message: 'AWS region is required' }]}
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

            <Flex justify="end" gap={8}>
              <Button onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleCreateAccount}
                loading={createDriftAssistSecretMutation.isPending}
              >
                Create Account
              </Button>
            </Flex>
          </Card>
        )}

        {/* Connect Button */}
        {selectedAccountId && !showCreateForm && (
          <Card size="small">
            <Flex justify="space-between" align="center">
              <div>
                <Text text="Ready to Connect" weight="semibold" style={{ display: 'block' }} />
                <Text 
                  text="Click the button below to test the connection and proceed to drift analysis." 
                  type="footnote" 
                  style={{ color: '#666' }}
                />
              </div>
              <Button
                type="primary"
                icon={<CloudOutlined />}
                onClick={handleConnectToAWS}
                loading={getDriftAssistSecretMutation.isLoading || connectToAWSMutation.isPending}
                size="large"
              >
                Connect to AWS
              </Button>
            </Flex>
          </Card>
        )}

        {/* Security Notice */}
        <div style={{ marginTop: 24, padding: '12px', background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px' }}>
          <Text 
            text="🔒 Security Notice: Your credentials are securely stored in AWS Secret Manager and encrypted with ARN-based access control. They are only used for AWS API calls during drift analysis." 
            type="footnote" 
            style={{ color: '#0066cc' }}
          />
        </div>
      </Form>
    </Flex>
  );
};

export default DriftAssistAccountDrawer;
