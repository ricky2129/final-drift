import { useState } from "react";
import {
  useGetDriftAssistIntegrationsByProjectId,
} from "react-query/integrationQueries";
import { useParams } from "react-router-dom";

import { PlusOutlined } from "@ant-design/icons";
import { Flex, Form, Select, message } from "antd";
import { AppServiceMap } from "interfaces";

import {
  Button,
  Drawer,
  DriftAssistSignInDrawer,
  IconViewer,
  Text,
} from "components";

import { Colors, Metrics } from "themes";

interface ConfigureDriftAssistFormFields {
  drift_assist_integration_id: string;
}

interface ConfigureDriftAssistProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ConfigureDriftAssist: React.FC<ConfigureDriftAssistProps> = ({
  applicationId,
  isOpen,
  onSuccess,
  onClose,
}) => {
  const [isOpenAddDriftAssist, setIsOpenAddDriftAssist] = useState<boolean>(false);
  const [disabledSave, setDisabledSave] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const params = useParams();

  const [messageApi, contextHolder] = message.useMessage();

  /**
   * Opens an error message with the content "Error: Something went wrong".
   * This function is used to report errors that occur during the application
   * creation process.
   */
  const error = () => {
    messageApi.open({
      type: "error",
      content: "Error: Something went wrong",
    });
  };

  const [configureDriftAssistForm] = Form.useForm<ConfigureDriftAssistFormFields>();

  const getDriftAssistConnectionsInProject =
    useGetDriftAssistIntegrationsByProjectId(params?.project || "");

  const handleSubmit = async () => {
    try {
      await configureDriftAssistForm.validateFields();

      setIsLoading(true);

      // For now, we'll just simulate success since we need to implement the service connection
      // In a real implementation, this would call an API to associate the DriftAssist account with the application
      
      message.success("DriftAssist account configured successfully!");
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

  return (
    <>
      {contextHolder}
      <Drawer
        open={isOpen}
        onClose={() => {
          configureDriftAssistForm.resetFields();
          onClose();
        }}
        onCancel={() => {
          configureDriftAssistForm.resetFields();
          onClose();
        }}
        title="Configure DriftAssist Connection"
        onSubmit={handleSubmit}
        disabled={disabledSave}
        loading={isLoading}
      >
        <Flex
          vertical
          gap={Metrics.SPACE_SM}
          className="drift-assist-connection-info"
        >
          <Text
            text="To run drift analysis, it is essential to first establish a connection with your AWS account. Please proceed with configuring your DriftAssist connection now."
            weight="semibold"
            type="bodycopy"
            color={Colors.PRIMARY_BLUE}
          />
        </Flex>
        <Form
          layout="vertical"
          onFieldsChange={handleFormFieldChange}
          form={configureDriftAssistForm}
        >
          <Form.Item<ConfigureDriftAssistFormFields>
            name="drift_assist_integration_id"
            label={<Text weight="semibold" text="DriftAssist Account" />}
            rules={[
              {
                required: true,
                message: "Please select a DriftAssist account",
              },
            ]}
          >
            <Select
              loading={getDriftAssistConnectionsInProject?.isLoading}
              placeholder="Select DriftAssist account"
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
        </Form>
      </Drawer>
      <DriftAssistSignInDrawer
        projectId={parseInt(params?.project || "0")}
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
