import React, { useState, useCallback } from 'react';

import { 
  Card, 
  Button, 
  Alert, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Badge,
  Spin
} from "antd";

import {
  ArrowLeftOutlined,
  CloudOutlined,
  DatabaseOutlined,
  SecurityScanOutlined,
  DesktopOutlined,
  FunctionOutlined,
  GlobalOutlined,
  UserOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  WarningOutlined,
  LoadingOutlined
} from "@ant-design/icons";

import { useGetStoredAnalysis } from "react-query/driftAssistQueries";

const { Title, Text, Paragraph } = Typography;

// AWS Resource configurations (same as S3StreamingAnalysis)
const AWS_RESOURCE_CONFIG = {
  ec2: {
    name: 'EC2 Instances',
    description: 'Virtual compute instances',
    icon: <DesktopOutlined />,
    color: '#FF9900',
    category: 'Compute'
  },
  s3: {
    name: 'S3 Buckets',
    description: 'Object storage buckets',
    icon: <DatabaseOutlined />,
    color: '#569A31',
    category: 'Storage'
  },
  iam: {
    name: 'IAM Users & Roles',
    description: 'Identity and access management',
    icon: <UserOutlined />,
    color: '#DD344C',
    category: 'Security'
  },
  rds: {
    name: 'RDS Databases',
    description: 'Relational database instances',
    icon: <DatabaseOutlined />,
    color: '#3F48CC',
    category: 'Database'
  },
  lambda: {
    name: 'Lambda Functions',
    description: 'Serverless compute functions',
    icon: <FunctionOutlined />,
    color: '#FF9900',
    category: 'Compute'
  },
  vpc: {
    name: 'VPC Networks',
    description: 'Virtual private cloud networks',
    icon: <GlobalOutlined />,
    color: '#8C4FFF',
    category: 'Networking'
  }
};

interface StoredAnalysisDisplayProps {
  projectId: string;
  applicationId: string;
  analysisId: number;
  onBack: () => void;
}

interface ResourceResult {
  status: string;
  detectionStatus: string;
  reportStatus: string;
  detectionResults?: any;
  reportResults?: any;
}

const StoredAnalysisDisplay: React.FC<StoredAnalysisDisplayProps> = ({
  projectId,
  applicationId,
  analysisId,
  onBack
}) => {
  const { data: analysisData, isLoading, error } = useGetStoredAnalysis(
    projectId, 
    applicationId, 
    analysisId, 
    true
  );

  // Debug logging
  console.log('🔍 StoredAnalysisDisplay Debug:', {
    projectId,
    applicationId,
    analysisId,
    isLoading,
    error: error?.message,
    hasData: !!analysisData,
    dataKeys: analysisData ? Object.keys(analysisData) : null,
    fullData: analysisData
  });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  /**
   * Get drift count for a resource (updated for stored analysis)
   */
  const getDriftCount = useCallback((results?: any) => {
    if (!results) return 0;
    const detectionData = results.detectionResults || results.drift_result || results;
    if (detectionData.drift_count !== undefined) {
      return detectionData.drift_count;
    }
    if (detectionData.drifts && Array.isArray(detectionData.drifts)) {
      return detectionData.drifts.length;
    }
    if (Array.isArray(detectionData)) {
      return detectionData.length;
    }
    if (detectionData.differences && Array.isArray(detectionData.differences)) {
      return detectionData.differences.length;
    }
    if (detectionData.has_drift === true) {
      return 1;
    }
    if (detectionData.has_drift === false) {
      return 0;
    }
    return 0;
  }, []);

  /**
   * Download data as JSON file (same as S3StreamingAnalysis)
   */
  const downloadAsJson = useCallback((data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Helper functions for the comprehensive report (same as S3StreamingAnalysis)
  const getDriftTypeIcon = (type: string) => {
    switch (type) {
      case 'missing': return '❌';
      case 'orphaned': return '🔗';
      case 'configuration_drift': return '⚙️';
      case 'error': return '⚠️';
      default: return '📋';
    }
  };

  const formatDriftType = (type: string) => {
    switch (type) {
      case 'missing': return 'Missing Resources';
      case 'orphaned': return 'Orphaned Resources';
      case 'configuration_drift': return 'Configuration Drift';
      case 'error': return 'Analysis Error';
      default: return 'Configuration Issue';
    }
  };

  const getRemediationGuidance = (type: string) => {
    switch (type) {
      case 'missing':
        return 'Run "terraform plan" to review changes, then "terraform apply" to create the missing resource.';
      case 'orphaned':
        return 'Import the resource into Terraform state using "terraform import" or remove it if no longer needed.';
      case 'configuration_drift':
        return 'Update your Terraform configuration to match the current state or revert cloud changes.';
      case 'error':
        return 'Check your AWS credentials and permissions, then retry the analysis.';
      default:
        return 'Review the configuration and align with your infrastructure as code standards.';
    }
  };

  const getBusinessImpact = (drifts: any[], resourceType: string) => {
    const highPriorityTypes = ['missing', 'error'];
    const hasHighPriority = drifts.some(d => highPriorityTypes.includes(d.type));
    if (hasHighPriority) {
      return High impact: Missing or error conditions may cause service disruptions for ${resourceType} resources.;
    } else {
      return Medium impact: Configuration drift may lead to compliance issues and unexpected behavior.;
    }
  };

  const getTechnicalImpact = (drifts: any[], resourceType: string) => {
    const driftCount = drifts.length;
    if (driftCount > 3) {
      return Significant technical debt: ${driftCount} issues indicate systematic infrastructure management problems.;
    } else if (driftCount > 1) {
      return Moderate complexity: Multiple configuration differences require coordinated remediation.;
    } else {
      return Low complexity: Single issue can be resolved quickly with minimal risk.;
    }
  };

  /**
   * Render comprehensive AI-generated report (same as S3StreamingAnalysis)
   */
  const renderComprehensiveReport = useCallback((detectionData: any, resourceType: string) => {
    if (!detectionData) return null;
    let drifts: any[] = [];
    if (detectionData.drifts && Array.isArray(detectionData.drifts)) {
      drifts = detectionData.drifts;
    } else if (Array.isArray(detectionData)) {
      drifts = detectionData;
    } else if (detectionData.differences && Array.isArray(detectionData.differences)) {
      drifts = detectionData.differences;
    }
    const driftCount = drifts.length;
    const resource = AWS_RESOURCE_CONFIG[resourceType.toLowerCase() as keyof typeof AWS_RESOURCE_CONFIG] || {
      name: resourceType.toUpperCase(),
      description: 'AWS Resource',
      icon: <DesktopOutlined />,
      color: '#6c757d',
      category: 'Other'
    };
    return (
      <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Executive Summary */}
        <div style={{ 
          background: driftCount === 0 ? 'linear-gradient(135deg, #f6ffed 0%, #f0f9e8 100%)' : 'linear-gradient(135deg, #fff2e8 0%, #ffebe6 100%)',
          border: driftCount === 0 ? '1px solid #b7eb8f' : '1px solid #ffbb96',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              background: resource.color,
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {resource.icon}
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#262626' }}>
                {resource.name} Analysis Report
              </Title>
              <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                {resource.category} • Infrastructure Drift Analysis
              </Text>
            </div>
          </div>
          {driftCount === 0 ? (
            <Alert 
              message="✅ No Infrastructure Drift Detected"
              description="Your resources match the expected configuration perfectly. Infrastructure is compliant with IaC definitions."
              type="success" 
              showIcon={false}
              style={{ 
                background: 'transparent',
                border: 'none',
                padding: 0
              }}
            />
          ) : (
            <Alert 
              message={⚠️ ${driftCount} Configuration Issue${driftCount !== 1 ? 's' : ''} Detected}
              description="Infrastructure configuration differs from expected state. Review the detailed analysis below for remediation guidance."
              type="warning" 
              showIcon={false}
              style={{ 
                background: 'transparent',
                border: 'none',
                padding: 0
              }}
            />
          )}
        </div>
        {/* Detailed Analysis */}
        {driftCount > 0 && (
          <>
            <Title level={4} style={{ color: '#262626', marginBottom: 16 }}>
              📊 Detailed Drift Analysis
            </Title>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
              {drifts.map((drift: any, index: number) => (
                <Card 
                  key={index} 
                  size="small" 
                  style={{ 
                    borderLeft: '4px solid #ff9800',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Title level={5} style={{ margin: 0, marginBottom: 8, color: '#262626' }}>
                      {getDriftTypeIcon(drift.type)} {formatDriftType(drift.type)}
                    </Title>
                    {drift.details && (
                      <Paragraph style={{ margin: 0, marginBottom: 8, color: '#595959', lineHeight: 1.6 }}>
                        {drift.details}
                      </Paragraph>
                    )}
                    {drift.resource && (
                      <div style={{ marginTop: 8 }}>
                        <Badge 
                          text={Resource: ${Array.isArray(drift.resource) ? drift.resource.join(' / ') : drift.resource}}
                          color="blue"
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                    )}
                  </div>
                  {/* Remediation Guidance */}
                  <div style={{ 
                    background: '#fafafa',
                    borderRadius: '6px',
                    padding: '12px',
                    marginTop: 12
                  }}>
                    <Text strong style={{ color: '#262626', fontSize: '13px' }}>
                      🔧 Recommended Action:
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ color: '#595959', fontSize: '12px', lineHeight: 1.5 }}>
                        {getRemediationGuidance(drift.type)}
                      </Text>
                    </div>
                  </div>
                </Card>
              ))}
            </Space>
            {/* Impact Assessment */}
            <Title level={4} style={{ color: '#262626', marginBottom: 16 }}>
              🎯 Impact Assessment
            </Title>
            <div style={{ 
              background: '#f0f8ff',
              border: '1px solid #d6f7ff',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: 24
            }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div>
                    <Text strong style={{ color: '#262626', fontSize: '14px' }}>
                      🏢 Business Impact:
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ color: '#595959', fontSize: '13px', lineHeight: 1.5 }}>
                        {getBusinessImpact(drifts, resourceType)}
                      </Text>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text strong style={{ color: '#262626', fontSize: '14px' }}>
                      ⚙️ Technical Impact:
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ color: '#595959', fontSize: '13px', lineHeight: 1.5 }}>
                        {getTechnicalImpact(drifts, resourceType)}
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
            {/* Best Practices */}
            <Title level={4} style={{ color: '#262626', marginBottom: 16 }}>
              💡 Prevention Best Practices
            </Title>
            <div style={{ 
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#595959', fontSize: '13px' }}>
                    <strong>Regular Monitoring:</strong> Schedule weekly drift detection scans for {resource.name.toLowerCase()}
                  </Text>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#595959', fontSize: '13px' }}>
                    <strong>Change Management:</strong> Require all infrastructure changes to go through Terraform
                  </Text>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#595959', fontSize: '13px' }}>
                    <strong>Access Control:</strong> Limit direct cloud console access to emergency situations only
                  </Text>
                </li>
                <li style={{ marginBottom: 0 }}>
                  <Text style={{ color: '#595959', fontSize: '13px' }}>
                    <strong>Automation:</strong> Implement CI/CD pipelines for infrastructure deployments
                  </Text>
                </li>
              </ul>
            </div>
          </>
        )}
        {/* No Drift - Best Practices */}
        {driftCount === 0 && (
          <>
            <Title level={4} style={{ color: '#262626', marginBottom: 16 }}>
              🎉 Excellent Infrastructure Management
            </Title>
            <div style={{ 
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <Text style={{ color: '#595959', fontSize: '14px', lineHeight: 1.6 }}>
                Your {resource.name.toLowerCase()} infrastructure is perfectly aligned with your IaC configuration. 
                This indicates excellent infrastructure governance and change management practices. 
                Continue monitoring regularly to maintain this high standard.
              </Text>
            </div>
          </>
        )}
      </div>
    );
  }, []);

  // Code Generated by Sidekick is for learning and experimentation purposes only.

// ... [previous code above remains unchanged] ...

  // Render resource card (same as S3StreamingAnalysis)
  const renderResourceCard = useCallback((resourceType: string, results: ResourceResult) => {
    const driftCount = getDriftCount(results);
    const resource = AWS_RESOURCE_CONFIG[resourceType.toLowerCase() as keyof typeof AWS_RESOURCE_CONFIG] || {
      name: resourceType.toUpperCase(),
      description: 'AWS Resource',
      icon: <DesktopOutlined />,
      color: '#6c757d',
      category: 'Other'
    };

    return (
      <Col xs={24} key={resourceType}>
        <Card
          style={{ 
            borderColor: resource.color,
            marginBottom: 24
          }}
        >
          {/* Header Section */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
            <div 
              style={{ 
                backgroundColor: resource.color,
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                marginRight: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {resource.icon}
            </div>
            <div style={{ flex: 1 }}>
              <Title level={4} style={{ margin: 0, fontSize: '18px', marginBottom: 4 }}>
                {resource.name}
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {resource.category} • {resource.description}
              </Text>
            </div>
            {/* Status Badges */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {driftCount > 0 && (
                <Badge 
                  count={${driftCount} issue${driftCount !== 1 ? 's' : ''}}
                  style={{ backgroundColor: '#f5222d' }}
                />
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge 
                  status="success"
                  text={
                    <span style={{ fontSize: '13px' }}>
                      Detection: complete
                    </span>
                  }
                />
                <Badge 
                  status="success"
                  text={
                    <span style={{ fontSize: '13px' }}>
                      Report: complete
                    </span>
                  }
                />
              </div>
            </div>
          </div>
          {/* Direct Report Display - Always Visible */}
          {results?.detectionResults && (
            <div>
              {/* AI-Generated Report Display - Full Width */}
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '24px',
                border: '1px solid #f0f0f0',
                minHeight: '400px'
              }}>
                {renderComprehensiveReport(results.detectionResults, resourceType)}
              </div>
              {/* Download Options */}
              <div style={{ marginTop: 16, textAlign: 'right', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Space size="middle">
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => downloadAsJson(results.detectionResults, stored_analysis_${resourceType}_detection.json)}
                  >
                    Export JSON
                  </Button>
                </Space>
              </div>
            </div>
          )}
          {/* No Data State */}
          {!results?.detectionResults && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #f0f0f0'
            }}>
              <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                No analysis data available for {resource.name.toLowerCase()}
              </Text>
            </div>
          )}
        </Card>
      </Col>
    );
  }, [getDriftCount, renderComprehensiveReport, downloadAsJson]);

  /**
   * Process stored analysis data to match S3StreamingAnalysis format
   * Based on the actual API response structure from the standalone backend
   * --- MODIFIED: Accepts selected_resources and filters output ---
   */
  const processStoredAnalysisData = useCallback((data: any) => {
    console.log('🔄 Processing stored analysis data from standalone backend:', data);
    if (!data) return {};

    // Get selected_resources from the API response (array of resource type strings)
    const selectedResources: string[] = Array.isArray(data.selected_resources) ? data.selected_resources : [];

    const processedResults: { [key: string]: ResourceResult } = {};

    // Process drift_results array (main source of drift data)
    if (data.drift_results && Array.isArray(data.drift_results)) {
      console.log('📊 Processing drift_results array:', data.drift_results.length, 'items');
      data.drift_results.forEach((driftResult: any) => {
        const resourceType = driftResult.resource_type;
        if (
          resourceType &&
          AWS_RESOURCE_CONFIG[resourceType.toLowerCase()] &&
          selectedResources.includes(resourceType)
        ) {
          processedResults[resourceType] = {
            status: 'completed',
            detectionStatus: 'completed',
            reportStatus: 'completed',
            detectionResults: {
              drifts: driftResult.drift_analysis || [],
              agent_raw_output: driftResult.agent_raw_output,
              validation_results: driftResult.validation_results,
              detection_metadata: driftResult.detection_metadata,
              timestamp: driftResult.timestamp
            }
          };
          console.log(✅ Processed ${resourceType} with ${driftResult.drift_analysis?.length || 0} drifts);
        }
      });
    }

    // Process analysis_data array for additional resource information
    if (data.analysis_data && Array.isArray(data.analysis_data)) {
      console.log('📊 Processing analysis_data array:', data.analysis_data.length, 'events');
      data.analysis_data.forEach((event: any) => {
        if (event.type === 'resource_group_update' && event.data?.resources) {
          Object.entries(event.data.resources).forEach(([resourceType, resourceData]: [string, any]) => {
            if (
              AWS_RESOURCE_CONFIG[resourceType.toLowerCase()] &&
              selectedResources.includes(resourceType) &&
              !processedResults[resourceType]
            ) {
              processedResults[resourceType] = {
                status: 'completed',
                detectionStatus: 'completed',
                reportStatus: 'completed',
                detectionResults: resourceData.drift_result || resourceData
              };
              console.log(✅ Processed ${resourceType} from analysis_data events);
            }
          });
        }
      });
    }

    // Process terraform_analysis if available
    if (data.terraform_analysis) {
      console.log('📊 Processing terraform_analysis');
      const terraformData = data.terraform_analysis;
      if (terraformData.resource_analysis) {
        Object.keys(terraformData.resource_analysis).forEach(resourceType => {
          if (
            AWS_RESOURCE_CONFIG[resourceType.toLowerCase()] &&
            selectedResources.includes(resourceType) &&
            !processedResults[resourceType]
          ) {
            processedResults[resourceType] = {
              status: 'completed',
              detectionStatus: 'completed',
              reportStatus: 'completed',
              detectionResults: terraformData.resource_analysis[resourceType]
            };
            console.log(✅ Processed ${resourceType} from terraform_analysis);
          }
        });
      }
    }

    // Fallback: Look for direct resource data in the main object
    if (Object.keys(processedResults).length === 0) {
      console.log('🔍 Fallback: Looking for direct resource data');
      Object.keys(AWS_RESOURCE_CONFIG).forEach(resourceType => {
        if (
          data[resourceType] &&
          selectedResources.includes(resourceType)
        ) {
          processedResults[resourceType] = {
            status: 'completed',
            detectionStatus: 'completed',
            reportStatus: 'completed',
            detectionResults: data[resourceType]
          };
          console.log(✅ Processed ${resourceType} from direct data);
        }
      });
    }

    console.log('✅ Final processed results:', Object.keys(processedResults));
    console.log('📊 Total resources processed:', Object.keys(processedResults).length);

    return processedResults;
  }, []);

  // Process the analysis data
  const processedResults = processStoredAnalysisData(analysisData);

  // Only show resources present in selected_resources
  const selectedResources: string[] = Array.isArray(analysisData?.selected_resources)
    ? analysisData.selected_resources
    : [];
  const resources = Object.keys(processedResults).filter(resourceType =>
    selectedResources.includes(resourceType)
  );

  // Render error state
  if (error) {
    return (
      <Card style={{ marginTop: 24 }}>
        <Alert
          message="Analysis Error"
          type="error"
          showIcon
        />
      </Card>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <Card 
          style={{ 
            background: 'white',
            border: '1px solid #f0f0f0',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                Loading stored analysis...
              </Text>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'white', 
      minHeight: 'calc(100vh - 64px)', 
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <Card 
          style={{ 
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #f0f0f0',
            overflow: 'hidden',
            background: 'white'
          }}
        >
          <div style={{ 
            padding: '24px 32px',
            borderBottom: '1px solid #f0f0f0',
            background: 'white',
            color: '#262626',
            marginBottom: 24,
            position: 'relative'
          }}>
            <div style={{ 
              position: 'relative',
              zIndex: 1,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={onBack}
                  style={{ marginRight: 16 }}
                >
                  Back
                </Button>
                <div style={{
                  background: '#1890ff',
                  borderRadius: '12px',
                  padding: '12px',
                  border: '1px solid #1890ff'
                }}>
                  <CloudOutlined style={{ fontSize: 24, color: 'white' }} />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0, color: '#262626', fontWeight: 600, fontSize: '20px' }}>
                    Stored Analysis Results
                  </Title>
                  <Text style={{ color: '#595959', fontSize: '14px', fontWeight: 400 }}>
                    Analysis ID: {analysisId}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                      Historical drift analysis • Stored results
                    </Text>
                  </div>
                </div>
              </div>
              <div style={{
                background: '#f6ffed',
                borderRadius: '8px',
                padding: '12px 16px',
                border: '1px solid #b7eb8f'
              }}>
                <Badge 
                  status="success" 
                  text={<span style={{ color: '#52c41a', fontSize: '14px', fontWeight: 500 }}>Analysis Complete</span>}
                />
              </div>
            </div>
          </div>
          <div style={{ padding: '0 32px 32px 32px' }}>
            {/* Resource Grid */}
            {resources.length > 0 && (
              <Row gutter={[24, 24]}>
                {resources.map(resourceType => 
                  renderResourceCard(resourceType, processedResults[resourceType])
                )}
              </Row>
            )}
            {/* No Resources Message */}
            {resources.length === 0 && (
              <Alert
                message="No Analysis Data Found"
                description="No resource analysis data was found for the selected resources in this stored analysis."
                type="info"
                showIcon
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StoredAnalysisDisplay;