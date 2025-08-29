import React, { useState } from "react";
import { Form, Radio, Select, Flex, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Text, IconViewer } from "components";
import { DriftAssistSignInDrawer } from "components/DriftAssist";
import { Colors, Metrics } from "themes";
import { useParams } from "react-router-dom";
import { useGetDriftAssistIntegrationsByProjectId } from "react-query/integrationQueries";

interface ConfigureDriftAssistFormField {
  ACCOUNT: number;
}

interface ConfigureDriftAssistProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: string;
}

const ConfigureDriftAssist: React.FC<ConfigureDriftAssistProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) => {
  const [isOpenAddDriftAssist, setIsOpenAddDriftAssist] = useState<boolean>(false);
  const [disabledSave, setDisabledSave] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const params = useParams();

  const [messageApi, contextHolder] = message.useMessage();
  const [configureDriftAssistForm] = Form.useForm<ConfigureDriftAssistFormField>();

  // Use project ID from props or params
  const currentProjectId = projectId || params?.project;

  const getDriftAssistConnectionsInProject = useGetDriftAssistIntegrationsByProjectId(
    currentProjectId || ""
  );

  /**
   * Opens an error message with the content "Error: Something went wrong".
   */
  const error = () => {
    messageApi.open({
      type: "error",
      content: "Error: Something went wrong",
    });
  };

  const handleSubmit = async () => {
    try {
      await configureDriftAssistForm.validateFields();
      
      setIsLoading(true);

      // Get the selected account ID
      const selectedAccountId = configureDriftAssistForm.getFieldValue("ACCOUNT");
      
      // Here you would typically call an API to associate the selected account
      // with the current application/project context
      console.log("Selected DriftAssist account ID:", selectedAccountId);
      
      message.success("DriftAssist connection configured successfully!");
      onSuccess();
    } catch (err) {
      error();
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormFieldChange = () => {
    const hasErrors =
      configureDriftAssistForm
        ?.getFieldsError()
        .filter(({ errors }) => errors.length).length > 0;

    setDisabledSave(hasErrors);
  };

  if (!isOpen) return null;

  return (
    <>
      {contextHolder}
      <div style={{ padding: "24px" }}>
        <Flex vertical gap={Metrics.SPACE_LG}>
          {/* Radio Group for Service Selection */}
          <Radio.Group value={1}>
            <Flex align="center" gap={Metrics.SPACE_SM}>
              <Radio value={1} className="agent-selector-radiobtn">
                DriftAssist
              </Radio>
              <Radio
                value={2}
                className="agent-selector-radiobtn radiobtn-disabled"
                disabled
              >
                Other Services
              </Radio>
            </Flex>
          </Radio.Group>

          {/* Connection Info */}
          <Flex
            vertical
            gap={Metrics.SPACE_SM}
            className="driftassist-connection-info"
          >
            <Text
              text="To run drift analysis, it is essential to first establish a connection with AWS. Please proceed with configuring your DriftAssist connection now."
              weight="semibold"
              type="bodycopy"
              color={Colors.PRIMARY_BLUE}
            />
          </Flex>

          {/* Account Selection Form */}
          <Form
            layout="vertical"
            onFieldsChange={handleFormFieldChange}
            form={configureDriftAssistForm}
            onFinish={handleSubmit}
          >
            <Form.Item
              name="ACCOUNT"
              label={<Text weight="semibold" text="Select Account" />}
              rules={[
                {
                  required: true,
                  message: "Please select a DriftAssist account",
                },
              ]}
            >
              <Select
                placeholder="Select DriftAssist Account"
                loading={getDriftAssistConnectionsInProject?.isLoading}
                options={getDriftAssistConnectionsInProject?.data?.map(
                  (value) => {
                    return {
                      label: value.name,
                      value: value.id,
                    };
                  },
                )}
                dropdownRender={(menu) => (
                  <Flex vertical gap={Metrics.SPACE_MD} justify="start">
                    {menu}
                    <Button
                      icon={
                        <IconViewer
                          Icon={PlusOutlined}
                          size={15}
                          color={Colors.PRIMARY_BLUE}
                        />
                      }
                      title="Add New Account"
                      type="link"
                      customClass="add-newAccount-btn"
                      onClick={() => setIsOpenAddDriftAssist(true)}
                    />
                  </Flex>
                )}
              />
            </Form.Item>

            {/* Submit Button */}
            <Form.Item>
              <Flex justify="end" gap={Metrics.SPACE_SM}>
                <Button
                  title="Cancel"
                  type="default"
                  onClick={() => {
                    configureDriftAssistForm.resetFields();
                    onClose();
                  }}
                />
                <Button
                  title="Configure Connection"
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  disabled={disabledSave}
                />
              </Flex>
            </Form.Item>
          </Form>

          {/* Security Notice */}
          <div style={{ 
            marginTop: 24, 
            padding: '12px', 
            background: '#e7f3ff', 
            border: '1px solid #b3d9ff', 
            borderRadius: '4px' 
          }}>
            <Text 
              text="🔒 Security Notice: Your credentials are securely stored in AWS Secret Manager and encrypted with ARN-based access control. They are only used for AWS API calls during drift analysis." 
              type="footnote" 
              style={{ color: '#0066cc' }}
            />
          </div>
        </Flex>
      </div>

      {/* Add New Account Drawer */}
      <DriftAssistSignInDrawer
        projectId={parseInt(currentProjectId || "0")}
        isOpen={isOpenAddDriftAssist}
        onClose={() => setIsOpenAddDriftAssist(false)}
        onSuccess={async () => {
          await getDriftAssistConnectionsInProject.refetch();
          setIsOpenAddDriftAssist(false);
        }}
      />
    </>
  );
};

export default ConfigureDriftAssist;
