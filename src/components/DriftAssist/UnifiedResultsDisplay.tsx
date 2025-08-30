import React, { useState, useMemo, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Alert, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Badge,
  Divider,
  Collapse,
  Tag
} from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BarChartOutlined,
  BugOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  FileTextOutlined,
  LoadingOutlined,
  CloudOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  FunctionOutlined,
  GlobalOutlined,
  UserOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Constants for report types and priorities
const REPORT_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

const PRIORITY_CONFIG = {
  [REPORT_PRIORITIES.HIGH]: {
    label: 'High Priority',
    icon: '🚨',
    color: '#dc2626',
    bgColor: 'rgb(220 38 38 / 0.1)',
    borderColor: 'rgb(220 38 38 / 0.2)',
    description: 'Critical issues requiring immediate attention'
  },
  [REPORT_PRIORITIES.MEDIUM]: {
    label: 'Medium Priority',
    icon: '⚠️',
    color: '#f59e0b',
    bgColor: 'rgb(245 158 11 / 0.1)',
    borderColor: 'rgb(245 158 11 / 0.2)',
    description: 'Important issues that should be addressed soon'
  },
  [REPORT_PRIORITIES.LOW]: {
    label: 'Low Priority',
    icon: '📋',
    color: '#8b5cf6',
    bgColor: 'rgb(139 92 246 / 0.1)',
    borderColor: 'rgb(139 92 246 / 0.2)',
    description: 'Minor issues for future consideration'
  }
};

// Legacy drift types for backward compatibility
const DRIFT_TYPES = {
  ORPHANED: 'orphaned',
  MISSING: 'missing',
  ATTRIBUTE: 'attribute',
  ERROR: 'error'
} as const;

const DRIFT_TYPE_CONFIG = {
  [DRIFT_TYPES.ORPHANED]: {
    label: 'Orphaned Resources',
    icon: '🔗',
    color: '#f59e0b',
    bgColor: 'rgb(245 158 11 / 0.1)',
    borderColor: 'rgb(245 158 11 / 0.2)',
    description: 'Resources that exist in the cloud but are not managed by your IaC'
  },
  [DRIFT_TYPES.MISSING]: {
    label: 'Missing Resources',
    icon: '❌',
    color: '#ef4444',
    bgColor: 'rgb(239 68 68 / 0.1)',
    borderColor: 'rgb(239 68 68 / 0.2)',
    description: 'Resources defined in IaC but not found in the cloud'
  },
  [DRIFT_TYPES.ATTRIBUTE]: {
    label: 'Configuration Drift',
    icon: '⚙️',
    color: '#8b5cf6',
    bgColor: 'rgb(139 92 246 / 0.1)',
    borderColor: 'rgb(139 92 246 / 0.2)',
    description: 'Resources with configuration differences between IaC and cloud'
  },
  [DRIFT_TYPES.ERROR]: {
    label: 'Analysis Errors',
    icon: '⚠️',
    color: '#dc2626',
    bgColor: 'rgb(220 38 38 / 0.1)',
    borderColor: 'rgb(220 38 38 / 0.2)',
    description: 'Errors encountered during drift analysis'
  }
};

interface UnifiedResultsDisplayProps {
  data: any;
  displayMode?: 'auto' | 'dashboard' | 'grouped' | 's3';
  onReset: () => void;
  onResourceSelect?: (resource: any) => void;
  apiBaseUrl?: string;
  isStoredAnalysis?: boolean;
  analysisMetadata?: any;
}

interface ProcessedItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  status?: string;
  error?: string;
  metadata?: any;
  analysisData?: any;
  hasError?: boolean;
  isReady?: boolean;
  resources?: any[];
  report?: any;
  drift?: any;
  driftType?: string;
  priority?: string;
  driftCount?: number;
  hasDrift?: boolean;
  detectionResults?: any;
  reportResults?: any;
  detectionStatus?: string;
  reportStatus?: string;
}

// AWS Resource configurations (copied from S3StreamingAnalysis)
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

interface ProcessedStats {
  total: number;
  totalDrifts: number;
  successful?: number;
  failed?: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

const UnifiedResultsDisplay: React.FC<UnifiedResultsDisplayProps> = ({ 
  data, 
  displayMode = 'auto',
  onReset,
  onResourceSelect,
  apiBaseUrl = (import.meta as any).env?.VITE_DRIFT_ASSIST_URL || 'http://localhost:8000',
  isStoredAnalysis = false,
  analysisMetadata
}) => {
  const [selectedType, setSelectedType] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['all']));
  const [pdfGenerationState, setPdfGenerationState] = useState<Record<string, any>>({});

  /**
   * Detect the data format and determine display mode
   */
  const detectedFormat = useMemo(() => {
    if (!data) return 'empty';
    
    // Check if this is stored analysis data
    if (isStoredAnalysis || (data.session_id && data.analysis_data)) {
      return 'stored';
    }
    
    // S3 analysis format
    if (data.type === 's3_bucket_analysis' || data.data?.bucket_name) {
      return 's3';
    }
    
    // Grouped streaming format
    if (typeof data === 'object' && !Array.isArray(data) && 
        Object.values(data).some((group: any) => group.resources)) {
      return 'grouped';
    }
    
    // Array of reports or drifts
    if (Array.isArray(data)) {
      if (data.length > 0 && data[0].drift_analysis) {
        return 'reports'; // New comprehensive report format
      }
      return 'legacy'; // Legacy drift format
    }
    
    return 'unknown';
  }, [data, isStoredAnalysis]);

  const effectiveDisplayMode = displayMode === 'auto' ? detectedFormat : displayMode;

  /**
   * Helper functions - defined before they're used
   */
  const getGroupStatus = (group: any) => {
    if (!group.resources || Object.keys(group.resources).length === 0) {
      return 'detecting';
    }

    const resourceStatuses = Object.values(group.resources).map((r: any) => r.status);
    
    if (resourceStatuses.every(status => status === 'completed')) {
      return 'completed';
    } else if (resourceStatuses.some(status => status === 'reporting')) {
      return 'reporting';
    } else if (resourceStatuses.some(status => status === 'detecting')) {
      return 'detecting';
    } else {
      return 'processing';
    }
  };

  const formatResourceName = (resource: any) => {
    if (Array.isArray(resource)) {
      return resource.filter(Boolean).join(' / ') || 'Resource';
    }
    if (typeof resource === 'string' && resource.trim()) {
      return resource.trim();
    }
    if (resource && typeof resource === 'object') {
      // Try to extract meaningful name from object
      const name = resource.name || resource.id || resource.resource_name || resource.resource_id;
      if (name) return name;
    }
    return 'Resource';
  };

  const mapDriftTypeToPriority = (driftType: string) => {
    switch (driftType) {
      case DRIFT_TYPES.MISSING:
      case DRIFT_TYPES.ERROR:
        return REPORT_PRIORITIES.HIGH;
      case DRIFT_TYPES.ORPHANED:
      case DRIFT_TYPES.ATTRIBUTE:
        return REPORT_PRIORITIES.MEDIUM;
      default:
        return REPORT_PRIORITIES.LOW;
    }
  };

  /**
   * Process data and extract statistics based on format
   */
  const processedData = useMemo(() => {
    if (!data) return { items: [], stats: { total: 0, totalDrifts: 0, byPriority: {}, byType: {} } };

    switch (effectiveDisplayMode) {
      case 'stored':
        return processStoredData(data);
      case 's3':
        return processS3Data(data);
      case 'grouped':
        return processGroupedData(data);
      case 'reports':
        return processReportsData(data);
      case 'legacy':
        return processLegacyData(data);
      default:
        return { items: [], stats: { total: 0, totalDrifts: 0, byPriority: {}, byType: {} } };
    }
  }, [data, effectiveDisplayMode]);

  /**
   * Process stored analysis data
   */
  function processStoredData(storedData: any): { items: ProcessedItem[], stats: ProcessedStats } {
    // Handle stored analysis data structure
    const analysisData = storedData.analysis_data || storedData;
    const driftResults = storedData.drift_results || [];
    
    // If we have drift_results array, process it as legacy format
    if (Array.isArray(driftResults) && driftResults.length > 0) {
      return processLegacyData(driftResults);
    }
    
    // If analysis_data contains reports array, process as reports format
    if (analysisData && Array.isArray(analysisData)) {
      if (analysisData.length > 0 && analysisData[0].drift_analysis) {
        return processReportsData(analysisData);
      }
      return processLegacyData(analysisData);
    }
    
    // If analysis_data is an object with grouped structure (like live analysis)
    if (analysisData && typeof analysisData === 'object' && !Array.isArray(analysisData)) {
      // Check if it's grouped format (like live streaming analysis)
      if (Object.values(analysisData).some((group: any) => group && group.resources)) {
        return processGroupedData(analysisData);
      }
      
      // Check if it's S3 format
      if (analysisData.type === 's3_bucket_analysis' || analysisData.data?.bucket_name) {
        return processS3Data(analysisData);
      }
      
      // Check if it's resource-based format (like S3StreamingAnalysis resourceResults)
      if (Object.keys(analysisData).some(key => 
        analysisData[key] && 
        (analysisData[key].detectionResults || analysisData[key].drift_result)
      )) {
        return processResourceBasedData(analysisData);
      }
    }
    
    // Fallback: create a single item from the stored data
    const items: ProcessedItem[] = [{
      id: `stored-${storedData.session_id || 'unknown'}`,
      type: 'stored_analysis',
      title: `Stored Analysis - ${storedData.session_id || 'Unknown Session'}`,
      subtitle: 'Previously saved analysis results',
      metadata: {
        sessionId: storedData.session_id,
        timestamp: storedData.created_at || storedData.timestamp,
        analysisType: storedData.analysis_type || 'drift_analysis'
      },
      analysisData: storedData,
      isReady: true
    }];

    const stats: ProcessedStats = {
      total: 1,
      totalDrifts: 0,
      byPriority: { [REPORT_PRIORITIES.HIGH]: 0, [REPORT_PRIORITIES.MEDIUM]: 0, [REPORT_PRIORITIES.LOW]: 0 },
      byType: { 'stored_analysis': 1 }
    };

    return { items, stats };
  }

  /**
   * Process resource-based data (like S3StreamingAnalysis format)
   */
  function processResourceBasedData(resourceData: any): { items: ProcessedItem[], stats: ProcessedStats } {
    const items: ProcessedItem[] = [];
    const stats: ProcessedStats = {
      total: 0,
      totalDrifts: 0,
      byPriority: { [REPORT_PRIORITIES.HIGH]: 0, [REPORT_PRIORITIES.MEDIUM]: 0, [REPORT_PRIORITIES.LOW]: 0 },
      byType: {}
    };

    Object.entries(resourceData).forEach(([resourceType, resourceResult]: [string, any]) => {
      if (!resourceResult) return;

      const detectionResults = resourceResult.detectionResults || resourceResult.drift_result;
      const driftCount = getDriftCount(resourceResult);
      
      stats.total++;
      if (driftCount > 0) {
        stats.totalDrifts += driftCount;
      }

      const resourceItem: ProcessedItem = {
        id: `resource-${resourceType}`,
        type: 'stored_resource',
        title: resourceType,
        subtitle: 'AWS Resource Analysis',
        status: resourceResult.status || 'completed',
        detectionResults,
        reportResults: resourceResult.reportResults,
        detectionStatus: resourceResult.detectionStatus || 'complete',
        reportStatus: resourceResult.reportStatus || 'complete',
        driftCount,
        hasDrift: driftCount > 0,
        isReady: true
      };

      items.push(resourceItem);
    });

    return { items, stats };
  }

  /**
   * Get drift count for a resource (copied from S3StreamingAnalysis)
   */
  const getDriftCount = useCallback((results?: any) => {
    if (!results?.detectionResults && !results?.drift_result) return 0;
    
    const detectionData = results.detectionResults || results.drift_result;
    if (detectionData.drift_count !== undefined) {
      return detectionData.drift_count;
    }
    
    if (detectionData.drifts && Array.isArray(detectionData.drifts)) {
      return detectionData.drifts.length;
    }
    
    return 0;
  }, []);

  /**
   * Process S3 analysis data
   */
  function processS3Data(s3Data: any): { items: ProcessedItem[], stats: ProcessedStats } {
    const analysisResults = s3Data.data?.analysis_results || [];
    const items: ProcessedItem[] = analysisResults.map((fileResult: any, index: number) => ({
      id: `s3-${index}`,
      type: 's3_file',
      title: fileResult.file_name,
      subtitle: fileResult.file_key,
      status: fileResult.status,
      error: fileResult.error,
      metadata: {
        size: fileResult.size,
        lastModified: fileResult.last_modified,
        bucket: s3Data.data?.bucket_name
      },
      analysisData: fileResult.analysis_data,
      hasError: fileResult.status === 'error',
      isReady: fileResult.status === 'ready_for_analysis'
    }));

    const stats: ProcessedStats = {
      total: s3Data.data?.total_files || 0,
      totalDrifts: 0,
      successful: s3Data.data?.successful_analyses || 0,
      failed: s3Data.data?.failed_analyses || 0,
      byPriority: { [REPORT_PRIORITIES.HIGH]: 0, [REPORT_PRIORITIES.MEDIUM]: 0, [REPORT_PRIORITIES.LOW]: 0 },
      byType: {}
    };

    return { items, stats };
  }

  /**
   * Process grouped streaming data
   */
  function processGroupedData(groupedData: any): { items: ProcessedItem[], stats: ProcessedStats } {
    const items: ProcessedItem[] = [];
    const stats: ProcessedStats = {
      total: 0,
      totalDrifts: 0,
      byPriority: { [REPORT_PRIORITIES.HIGH]: 0, [REPORT_PRIORITIES.MEDIUM]: 0, [REPORT_PRIORITIES.LOW]: 0 },
      byType: {}
    };

    Object.entries(groupedData).forEach(([groupName, group]: [string, any]) => {
      if (!group.resources) return;

      const groupItem: ProcessedItem = {
        id: `group-${groupName}`,
        type: 'resource_group',
        title: groupName,
        subtitle: `${Object.keys(group.resources).length} resources`,
        status: getGroupStatus(group),
        resources: Object.entries(group.resources).map(([resourceName, resourceData]: [string, any]) => {
          stats.total++;
          const hasDrift = resourceData.drift_result?.has_drift;
          if (hasDrift) {
            stats.totalDrifts += resourceData.drift_result.drift_count || 1;
          }

          return {
            id: `resource-${groupName}-${resourceName}`,
            type: 'resource',
            title: resourceName,
            status: resourceData.status,
            driftResult: resourceData.drift_result,
            report: resourceData.report,
            explanation: resourceData.explanation,
            hasDrift,
            isNewReportFormat: resourceData.report && (resourceData.report.drift_analysis || resourceData.report.impact_assessment)
          };
        })
      };

      items.push(groupItem);
    });

    return { items, stats };
  }

  /**
   * Process new comprehensive reports data
   */
  function processReportsData(reportsData: any[]): { items: ProcessedItem[], stats: ProcessedStats } {
    const items: ProcessedItem[] = reportsData.map((report: any, index: number) => ({
      id: `report-${index}`,
      type: 'comprehensive_report',
      title: report.resource_id || report.resource_type || 'Unknown Resource',
      subtitle: 'Comprehensive Analysis Report',
      report,
      priority: report.remediation_guidance?.priority?.toLowerCase() || 'low',
      driftCount: report.drift_analysis?.drift_count || 0,
      hasDrift: (report.drift_analysis?.drift_count || 0) > 0
    }));

    const stats: ProcessedStats = {
      total: items.length,
      totalDrifts: items.reduce((sum, item) => sum + (item.driftCount || 0), 0),
      byPriority: { [REPORT_PRIORITIES.HIGH]: 0, [REPORT_PRIORITIES.MEDIUM]: 0, [REPORT_PRIORITIES.LOW]: 0 },
      byType: {}
    };

    items.forEach(item => {
      if (item.priority && stats.byPriority[item.priority] !== undefined) {
        stats.byPriority[item.priority]++;
      }
    });

    return { items, stats };
  }

  /**
   * Process legacy drift data
   */
  function processLegacyData(driftsData: any[]): { items: ProcessedItem[], stats: ProcessedStats } {
    const actualDrifts = driftsData.filter((drift: any) => drift.type !== 'debug_info');
    
    const items: ProcessedItem[] = actualDrifts.map((drift: any, index: number) => ({
      id: `drift-${index}`,
      type: 'legacy_drift',
      title: formatResourceName(drift.resource),
      subtitle: drift.type || 'Configuration Drift',
      drift,
      driftType: drift.type || 'error',
      priority: mapDriftTypeToPriority(drift.type)
    }));

    const stats: ProcessedStats = {
      total: items.length,
      totalDrifts: items.length,
      byType: {},
      byPriority: { [REPORT_PRIORITIES.HIGH]: 0, [REPORT_PRIORITIES.MEDIUM]: 0, [REPORT_PRIORITIES.LOW]: 0 }
    };

    // Initialize counters
    Object.keys(DRIFT_TYPES).forEach(type => {
      stats.byType[DRIFT_TYPES[type as keyof typeof DRIFT_TYPES]] = 0;
    });

    // Count drifts by type and priority
    items.forEach(item => {
      const type = item.driftType;
      if (type) {
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
      if (item.priority) {
        stats.byPriority[item.priority]++;
      }
    });

    return { items, stats };
  }

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  }, []);

  /**
   * Render comprehensive AI-generated report (copied from S3StreamingAnalysis)
   */
  const renderComprehensiveReport = useCallback((detectionData: any, resourceType: string) => {
    if (!detectionData) return null;

    // Extract drift data
    let drifts: any[] = [];
    if (detectionData.drifts && Array.isArray(detectionData.drifts)) {
      drifts = detectionData.drifts;
    } else if (Array.isArray(detectionData)) {
      drifts = detectionData;
    } else if (detectionData.differences && Array.isArray(detectionData.differences)) {
      drifts = detectionData.differences;
    } else if (detectionData.drift_analysis && detectionData.drift_analysis.details) {
      // Handle comprehensive report format
      if (Array.isArray(detectionData.drift_analysis.details)) {
        drifts = detectionData.drift_analysis.details;
      } else if (typeof detectionData.drift_analysis.details === 'object') {
        drifts = [detectionData.drift_analysis.details];
      }
    }

    const driftCount = drifts.length;

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
              background: '#1890ff',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SecurityScanOutlined />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#262626' }}>
                {resourceType} Analysis Report
              </Title>
              <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                Infrastructure Drift Analysis
              </Text>
            </div>
          </div>

          {driftCount === 0 ? (
            <Alert 
              message="✅ No Infrastructure Drift Detected"
              description="Excellent! Your resources match the expected configuration perfectly. Infrastructure is compliant with IaC definitions."
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
              message={`⚠️ ${driftCount} Configuration Issue${driftCount !== 1 ? 's' : ''} Detected`}
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
                          text={`Resource: ${Array.isArray(drift.resource) ? drift.resource.join(' / ') : drift.resource}`}
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
                    <strong>Regular Monitoring:</strong> Schedule weekly drift detection scans for {resourceType.toLowerCase()}
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
                Your {resourceType.toLowerCase()} infrastructure is perfectly aligned with your IaC configuration. 
                This indicates excellent infrastructure governance and change management practices. 
                Continue monitoring regularly to maintain this high standard.
              </Text>
            </div>
          </>
        )}
      </div>
    );
  }, []);

  // Helper functions for the comprehensive report
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
      return `High impact: Missing or error conditions may cause service disruptions for ${resourceType} resources.`;
    } else {
      return `Medium impact: Configuration drift may lead to compliance issues and unexpected behavior.`;
    }
  };

  const getTechnicalImpact = (drifts: any[], resourceType: string) => {
    const driftCount = drifts.length;
    
    if (driftCount > 3) {
      return `Significant technical debt: ${driftCount} issues indicate systematic infrastructure management problems.`;
    } else if (driftCount > 1) {
      return `Moderate complexity: Multiple configuration differences require coordinated remediation.`;
    } else {
      return `Low complexity: Single issue can be resolved quickly with minimal risk.`;
    }
  };

  /**
   * Download data as JSON file
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

  /**
   * Render beautiful resource card with direct report display (copied from S3StreamingAnalysis)
   */
  const renderResourceCard = useCallback((resourceId: string, results?: any, fileName?: string) => {
    const resource = AWS_RESOURCE_CONFIG[resourceId.toLowerCase() as keyof typeof AWS_RESOURCE_CONFIG] || {
      name: resourceId.toUpperCase(),
      description: 'AWS Resource',
      icon: <DesktopOutlined />,
      color: '#6c757d',
      category: 'Other'
    };

    const detectionStatus = results?.detectionStatus || 'pending';
    const reportStatus = results?.reportStatus || 'pending';
    const driftCount = getDriftCount(results);

    return (
      <div key={resourceId}>
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
                  count={`${driftCount} issue${driftCount !== 1 ? 's' : ''}`}
                  style={{ backgroundColor: '#f5222d' }}
                />
              )}
              
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge 
                  status={detectionStatus === 'complete' ? 'success' : 'processing'}
                  text={
                    <span style={{ fontSize: '13px' }}>
                      {`Detection: ${detectionStatus}`}
                    </span>
                  }
                />
                <Badge 
                  status={reportStatus === 'complete' ? 'success' : 'processing'}
                  text={
                    <span style={{ fontSize: '13px' }}>
                      {`Report: ${reportStatus}`}
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          {/* Direct Report Display - Always Visible */}
          {(results?.detectionResults || results?.reportResults) && (
            <div>
              {/* AI-Generated Report Display - Full Width */}
              {results?.detectionResults && (
                <div style={{ 
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '24px',
                  border: '1px solid #f0f0f0',
                  minHeight: '400px'
                }}>
                  {renderComprehensiveReport(results.detectionResults, resourceId)}
                </div>
              )}

              {/* Download Options */}
              <div style={{ marginTop: 16, textAlign: 'right', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Space size="middle">
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => downloadAsJson(results.detectionResults, `${fileName || resourceId}_${resourceId}_detection.json`)}
                  >
                    Export JSON
                  </Button>
                </Space>
              </div>
            </div>
          )}

          {/* Loading State for Pending Reports */}
          {!results?.detectionResults && detectionStatus === 'pending' && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              background: '#fafafa',
              borderRadius: '8px',
              border: '1px solid #f0f0f0'
            }}>
              <div style={{ marginBottom: 16 }}>
                {React.createElement(LoadingOutlined, { style: { fontSize: 24 } })}
              </div>
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                  Analyzing {resource.name.toLowerCase()}...
                </Text>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }, [getDriftCount, renderComprehensiveReport, downloadAsJson]);

  /**
   * Download data as PDF report with enhanced UX
   */
  const downloadAsPdf = useCallback(async (data: any, resourceType: string, filename: string) => {
    const pdfKey = `${resourceType}_${filename}`;

    try {
      // Set initial PDF generation state
      setPdfGenerationState(prev => ({
        ...prev,
        [pdfKey]: {
          isGenerating: true,
          stage: 'preparing',
          progress: 0,
          message: '🔄 Preparing PDF generation...'
        }
      }));

      // Update progress during generation
      const updateProgress = (stage: string, progress: number, message: string) => {
        setPdfGenerationState(prev => ({
          ...prev,
          [pdfKey]: { ...prev[pdfKey], stage, progress, message }
        }));
      };

      updateProgress('generating', 25, '📄 Generating PDF report...');

      const response = await fetch(`${apiBaseUrl}/api/reports/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: data,
          resource_type: resourceType,
          filename: filename,
          title: `Infrastructure Drift Report - ${resourceType}`,
          subtitle: `Analysis Results for ${filename}`
        })
      });

      updateProgress('processing', 75, '⚙️ Processing report data...');

      if (response.ok) {
        updateProgress('downloading', 100, '🎉 Report ready! Starting download...');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${resourceType}_drift_report.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success state briefly
        setPdfGenerationState(prev => ({
          ...prev,
          [pdfKey]: {
            ...prev[pdfKey],
            stage: 'completed',
            progress: 100,
            message: '✅ PDF downloaded successfully!'
          }
        }));

        // Clear state after 3 seconds
        setTimeout(() => {
          setPdfGenerationState(prev => {
            const newState = { ...prev };
            delete newState[pdfKey];
            return newState;
          });
        }, 3000);

        console.log('🎉 PDF report downloaded successfully');
      } else {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('PDF download failed:', error);
      
      setPdfGenerationState(prev => ({
        ...prev,
        [pdfKey]: {
          ...prev[pdfKey],
          stage: 'error',
          progress: 0,
          message: '❌ PDF generation failed'
        }
      }));

      // Clear error state after 5 seconds
      setTimeout(() => {
        setPdfGenerationState(prev => {
          const newState = { ...prev };
          delete newState[pdfKey];
          return newState;
        });
      }, 5000);
    }
  }, [apiBaseUrl]);

  /**
   * Filter items based on selected type
   */
  const filteredItems = useMemo(() => {
    if (selectedType === 'all') {
      return processedData.items;
    }

    return processedData.items.filter(item => {
      if (effectiveDisplayMode === 'reports') {
        return item.priority === selectedType;
      } else if (effectiveDisplayMode === 'legacy') {
        return item.driftType === selectedType;
      }
      return true;
    });
  }, [processedData.items, selectedType, effectiveDisplayMode]);

  /**
   * Toggle item expansion
   */
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  /**
   * Render summary statistics
   */
  const renderSummary = () => {
    const { stats } = processedData;
    
    return (
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
            Infrastructure Analysis Results
          </Title>
          <Text type="secondary">
            {effectiveDisplayMode === 's3' ? (
              <>S3 bucket analysis completed with {stats.successful} successful and {stats.failed} failed analyses</>
            ) : effectiveDisplayMode === 'grouped' ? (
              <>Real-time analysis processed {stats.total} resources with {stats.totalDrifts} drifts detected</>
            ) : effectiveDisplayMode === 'reports' ? (
              <>AI-powered analysis generated {stats.total} comprehensive reports covering {stats.totalDrifts} drifts</>
            ) : (
              <>Analysis detected {stats.total} drifts in your infrastructure</>
            )}
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={6}>
            <Card 
              size="small" 
              style={{ 
                textAlign: 'center',
                cursor: 'pointer',
                borderColor: selectedType === 'all' ? '#1890ff' : undefined
              }}
              onClick={() => setSelectedType('all')}
            >
              <div style={{ fontSize: '24px', marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: 4 }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {effectiveDisplayMode === 's3' ? 'Total Files' : 
                 effectiveDisplayMode === 'grouped' ? 'Total Resources' :
                 effectiveDisplayMode === 'reports' ? 'Total Reports' : 'Total Drifts'}
              </div>
            </Card>
          </Col>

          {/* Render priority/type filters based on display mode */}
          {(effectiveDisplayMode === 'reports' || effectiveDisplayMode === 'grouped') && 
            Object.entries(PRIORITY_CONFIG).map(([priority, config]) => {
              const count = stats.byPriority[priority] || 0;
              if (count === 0) return null;

              return (
                <Col xs={24} sm={8} md={6} key={priority}>
                  <Card
                    size="small"
                    style={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderColor: selectedType === priority ? config.color : undefined,
                      backgroundColor: selectedType === priority ? config.bgColor : undefined
                    }}
                    onClick={() => setSelectedType(priority)}
                  >
                    <div style={{ fontSize: '24px', marginBottom: 8 }}>{config.icon}</div>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold', 
                      marginBottom: 4,
                      color: config.color 
                    }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {config.label}
                    </div>
                  </Card>
                </Col>
              );
            })
          }

          {effectiveDisplayMode === 'legacy' && 
            Object.entries(DRIFT_TYPE_CONFIG).map(([type, config]) => {
              const count = stats.byType[type] || 0;
              if (count === 0) return null;

              return (
                <Col xs={24} sm={8} md={6} key={type}>
                  <Card
                    size="small"
                    style={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderColor: selectedType === type ? config.color : undefined,
                      backgroundColor: selectedType === type ? config.bgColor : undefined
                    }}
                    onClick={() => setSelectedType(type)}
                  >
                    <div style={{ fontSize: '24px', marginBottom: 8 }}>{config.icon}</div>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: 'bold', 
                      marginBottom: 4,
                      color: config.color 
                    }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {config.label}
                    </div>
                  </Card>
                </Col>
              );
            })
          }
        </Row>
      </Card>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '48px', marginBottom: 16 }}>🎉</div>
      <Title level={3}>No Infrastructure Drift Detected!</Title>
      <Paragraph>Your infrastructure is perfectly aligned with your IaC configuration.</Paragraph>
      <Button 
        type="primary" 
        icon={<ReloadOutlined />}
        onClick={onReset}
      >
        Run New Analysis
      </Button>
    </Card>
  );

  // Main render logic
  if (!data || processedData.stats.total === 0) {
    return renderEmptyState();
  }

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '100%', 
      margin: '0 auto',
      background: 'white',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {renderSummary()}

      <Card style={{ 
        borderRadius: 16, 
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        border: '1px solid rgba(24, 144, 255, 0.1)',
        background: 'white',
        width: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ 
          marginBottom: 32, 
          padding: '24px 32px',
          background: 'white',
          color: '#262626',
          borderRadius: '12px 12px 0 0',
          margin: '-24px -24px 32px -24px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Title level={3} style={{ margin: 0, marginBottom: 8, color: '#262626', fontWeight: 600 }}>
            📊 Analysis Details
          </Title>
          <Text style={{ fontSize: 14, color: '#8c8c8c' }}>
            {filteredItems.length} of {processedData.items.length} items shown • Comprehensive drift analysis
          </Text>
        </div>

        <Collapse 
          activeKey={Array.from(expandedItems)}
          onChange={(keys) => setExpandedItems(new Set(keys as string[]))}
          style={{ background: 'transparent' }}
          size="large"
        >
          {filteredItems.map((item, index) => (
            <Panel
              key={item.id}
              header={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        fontSize: '20px',
                        color: item.priority ? PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG]?.color : '#1890ff'
                      }}>
                        {item.priority ? PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG]?.icon : 
                         item.driftType ? DRIFT_TYPE_CONFIG[item.driftType as keyof typeof DRIFT_TYPE_CONFIG]?.icon : '📋'}
                      </div>
                      <div>
                        <Title level={5} style={{ margin: 0, marginBottom: 2 }}>
                          {item.title}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 14 }}>{item.subtitle}</Text>
                      </div>
                    </div>
                  </div>
                  
                  <Space onClick={(e) => e.stopPropagation()}>
                    {item.driftCount !== undefined && item.driftCount > 0 && (
                      <Tag color="orange" style={{ margin: 0 }}>
                        {item.driftCount} drift{item.driftCount !== 1 ? 's' : ''}
                      </Tag>
                    )}
                    {item.priority && (
                      <Tag 
                        color={PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG]?.color}
                        style={{ margin: 0 }}
                      >
                        {item.priority.toUpperCase()}
                      </Tag>
                    )}
                    {item.status && (
                      <Badge 
                        status={item.hasError ? 'error' : item.isReady ? 'success' : 'processing'}
                        text={item.status}
                      />
                    )}
                    
                    {/* Download Actions */}
                    <Space.Compact>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAsJson(item, `${item.title}_analysis.json`);
                        }}
                        title="Download JSON"
                      />
                      <Button
                        size="small"
                        icon={<FileTextOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAsPdf(item, item.type, item.title);
                        }}
                        title="Download PDF Report"
                        loading={pdfGenerationState[`${item.type}_${item.title}`]?.isGenerating}
                      />
                    </Space.Compact>
                  </Space>
                </div>
              }
              style={{ 
                marginBottom: 16,
                border: `1px solid ${item.priority ? PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG]?.borderColor : '#f0f0f0'}`,
                borderRadius: 8,
                background: item.priority ? PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG]?.bgColor : 'white'
              }}
            >
              {/* Detailed Report Content */}
              <div style={{ padding: '16px 0' }}>
                {/* Error Display */}
                {item.error && (
                  <Alert
                    message="Analysis Error"
                    description={item.error}
                    type="error"
                    style={{ marginBottom: 16 }}
                    showIcon
                  />
                )}

                {/* PDF Generation Status */}
                {pdfGenerationState[`${item.type}_${item.title}`] && (
                  <Alert
                    message={pdfGenerationState[`${item.type}_${item.title}`].message}
                    type={pdfGenerationState[`${item.type}_${item.title}`].stage === 'error' ? 'error' : 'info'}
                    style={{ marginBottom: 16 }}
                    showIcon
                    icon={pdfGenerationState[`${item.type}_${item.title}`].stage === 'error' ? 
                      <BugOutlined /> : <LoadingOutlined spin />}
                  />
                )}

                {/* S3 File Details */}
                {item.type === 's3_file' && (
                  <div>
                    <Title level={5} style={{ marginBottom: 12 }}>📁 File Information</Title>
                    <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
                      <Col span={8}>
                        <Text strong>File Size:</Text>
                        <div>{item.metadata?.size ? formatFileSize(item.metadata.size) : 'Unknown'}</div>
                      </Col>
                      <Col span={8}>
                        <Text strong>Last Modified:</Text>
                        <div>{item.metadata?.lastModified ? formatDate(item.metadata.lastModified) : 'Unknown'}</div>
                      </Col>
                      <Col span={8}>
                        <Text strong>S3 Bucket:</Text>
                        <div>{item.metadata?.bucket || 'Unknown'}</div>
                      </Col>
                    </Row>
                    
                    {item.analysisData && (
                      <div>
                        <Title level={5} style={{ marginBottom: 12 }}>🔍 Analysis Data</Title>
                        <Card size="small" style={{ background: '#fafafa' }}>
                          <pre style={{ 
                            margin: 0, 
                            fontSize: 12, 
                            maxHeight: 300, 
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {JSON.stringify(item.analysisData, null, 2)}
                          </pre>
                        </Card>
                      </div>
                    )}
                  </div>
                )}

                {/* Comprehensive Report Details - Using existing UI pattern */}
                {item.type === 'comprehensive_report' && item.report && (
                  <div style={{ 
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid #f0f0f0',
                    minHeight: '400px'
                  }}>
                    {renderComprehensiveReport(item.report, item.title)}
                  </div>
                )}

                {/* Legacy Drift Details */}
                {item.type === 'legacy_drift' && item.drift && (
                  <div>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      <BugOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
                      Drift Details
                    </Title>
                    <Card size="small" style={{ background: '#fff7e6', border: '1px solid #ffd591' }}>
                      <Row gutter={[16, 8]}>
                        <Col span={12}>
                          <Text strong>Drift Type:</Text>
                          <div>
                            <Tag color={DRIFT_TYPE_CONFIG[item.driftType as keyof typeof DRIFT_TYPE_CONFIG]?.color}>
                              {item.driftType?.toUpperCase() || 'UNKNOWN'}
                            </Tag>
                          </div>
                        </Col>
                        <Col span={12}>
                          <Text strong>Resource:</Text>
                          <div>{formatResourceName(item.drift.resource)}</div>
                        </Col>
                      </Row>
                      
                      {item.drift.details && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong>Details:</Text>
                          <div style={{ 
                            marginTop: 8, 
                            padding: 12, 
                            background: 'white', 
                            borderRadius: 6,
                            border: '1px solid #f0f0f0'
                          }}>
                            <pre style={{ 
                              margin: 0, 
                              fontSize: 12, 
                              whiteSpace: 'pre-wrap',
                              maxHeight: 200,
                              overflow: 'auto'
                            }}>
                              {typeof item.drift.details === 'string' 
                                ? item.drift.details 
                                : JSON.stringify(item.drift.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* Stored Resource Details - Using S3StreamingAnalysis format */}
                {item.type === 'stored_resource' && (
                  <div>
                    {renderResourceCard(item.title, {
                      detectionResults: item.detectionResults,
                      reportResults: item.reportResults,
                      detectionStatus: item.detectionStatus,
                      reportStatus: item.reportStatus
                    }, item.title)}
                  </div>
                )}

                {/* Stored Analysis Details */}
                {item.type === 'stored_analysis' && (
                  <div>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                      Stored Analysis Information
                    </Title>
                    <Card size="small" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <Row gutter={[16, 8]}>
                        <Col span={8}>
                          <Text strong>Session ID:</Text>
                          <div>{item.metadata?.sessionId || 'Unknown'}</div>
                        </Col>
                        <Col span={8}>
                          <Text strong>Analysis Type:</Text>
                          <div>
                            <Tag color="blue">
                              {item.metadata?.analysisType?.toUpperCase() || 'DRIFT_ANALYSIS'}
                            </Tag>
                          </div>
                        </Col>
                        <Col span={8}>
                          <Text strong>Timestamp:</Text>
                          <div>{item.metadata?.timestamp ? formatDate(item.metadata.timestamp) : 'Unknown'}</div>
                        </Col>
                      </Row>
                      
                      {item.analysisData && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong>Raw Analysis Data:</Text>
                          <div style={{ 
                            marginTop: 8, 
                            padding: 12, 
                            background: 'white', 
                            borderRadius: 6,
                            border: '1px solid #f0f0f0'
                          }}>
                            <pre style={{ 
                              margin: 0, 
                              fontSize: 12, 
                              whiteSpace: 'pre-wrap',
                              maxHeight: 300,
                              overflow: 'auto'
                            }}>
                              {JSON.stringify(item.analysisData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* Resource Group Details */}
                {item.type === 'resource_group' && item.resources && (
                  <div>
                    <Title level={5} style={{ marginBottom: 12 }}>
                      <BarChartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                      Resource Analysis ({item.resources.length} resources)
                    </Title>
                    
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                      {item.resources.map((resource: any, idx: number) => (
                        <Card 
                          key={idx} 
                          size="small" 
                          style={{ 
                            marginBottom: 12,
                            border: resource.hasDrift ? '1px solid #ffd591' : '1px solid #f0f0f0',
                            background: resource.hasDrift ? '#fff7e6' : 'white'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text strong>{resource.title}</Text>
                              <div style={{ marginTop: 4 }}>
                                <Badge 
                                  status={resource.hasDrift ? 'warning' : 'success'}
                                  text={resource.status || 'Unknown'}
                                />
                              </div>
                            </div>
                            
                            {resource.hasDrift && resource.driftResult && (
                              <Tag color="orange">
                                {resource.driftResult.drift_count || 1} drift{(resource.driftResult.drift_count || 1) !== 1 ? 's' : ''}
                              </Tag>
                            )}
                          </div>
                          
                          {resource.explanation && (
                            <div style={{ marginTop: 12, padding: 8, background: '#fafafa', borderRadius: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {resource.explanation}
                              </Text>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </Collapse>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button 
            type="default" 
            icon={<ReloadOutlined />}
            onClick={onReset}
          >
            Run New Analysis
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default UnifiedResultsDisplay;
