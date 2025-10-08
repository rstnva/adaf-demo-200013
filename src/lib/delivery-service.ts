// NOTE: Install required packages:
// npm install nodemailer @types/nodemailer aws-sdk @types/aws-sdk

import { GeneratedReport } from '@/types/scheduling';

// =============================================================================
// Email Service Configuration
// =============================================================================

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  urlExpirationHours: number;
}

// Load configuration from environment variables or vault
function getEmailConfig(): EmailConfig {
  return {
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.FROM_EMAIL || 'reports@adaf.com',
    fromName: process.env.FROM_NAME || 'ADAF Reports'
  };
}

function getS3Config(): S3Config {
  return {
    bucketName: process.env.S3_BUCKET_NAME || 'adaf-reports',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    urlExpirationHours: parseInt(process.env.S3_URL_EXPIRATION_HOURS || '72')
  };
}

// =============================================================================
// Email Templates
// =============================================================================

export function generateEmailTemplate(report: GeneratedReport, downloadUrl?: string): {
  subject: string;
  html: string;
  text: string;
} {
  const reportTypeTitle = report.type === 'onepager' ? 'OnePager Report' : 'Quarterly Report';
  const subject = `ADAF ${reportTypeTitle} - ${report.period}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .report-info { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>ADAF ${reportTypeTitle}</h1>
            <p>Period: ${report.period}</p>
        </div>
        
        <div class="content">
            <h2>Institutional Report Ready</h2>
            <p>Dear Stakeholder,</p>
            
            <p>The ${reportTypeTitle.toLowerCase()} for period <strong>${report.period}</strong> has been generated and is ready for review.</p>
            
            <div class="report-info">
                <h3>Report Details</h3>
                <ul>
                    <li><strong>Type:</strong> ${reportTypeTitle}</li>
                    <li><strong>Period:</strong> ${report.period}</li>
                    <li><strong>Generated:</strong> ${new Date(report.createdAt).toLocaleString()}</li>
                    <li><strong>File Size:</strong> ${(report.fileSizeBytes / 1024).toFixed(1)} KB</li>
                    <li><strong>SHA256:</strong> ${report.sha256}</li>
                </ul>
            </div>
            
            ${downloadUrl ? `
                <p>Click the button below to download the report:</p>
                <a href="${downloadUrl}" class="button">Download Report</a>
                <p><small>This download link will expire in 72 hours for security purposes.</small></p>
            ` : `
                <p>The report is attached to this email as a PDF file.</p>
            `}
            
            <h3>Report Contents</h3>
            ${report.type === 'onepager' ? `
                <ul>
                    <li>Executive Summary</li>
                    <li>Key Performance Indicators (IRR, TVPI, MOIC, DPI, RVPI)</li>
                    <li>Net Asset Value and Cash Flow Analysis</li>
                    <li>Proof of Reserves Summary</li>
                </ul>
            ` : `
                <ul>
                    <li>Comprehensive Performance Analysis</li>
                    <li>Detailed Methodology and Assumptions</li>
                    <li>Complete Proof of Reserves by Chain</li>
                    <li>Risk Management and Compliance Disclosures</li>
                    <li>Market Commentary and Outlook</li>
                </ul>
            `}
            
            <p>If you have any questions about this report, please don't hesitate to contact our team.</p>
            
            <p>Best regards,<br>
            ADAF Institutional Team</p>
        </div>
        
        <div class="footer">
            <p>This email was automatically generated by the ADAF Reporting System.</p>
            <p>ADAF - Advanced Digital Asset Fund | reports@adaf.com</p>
            <p><strong>Confidential:</strong> This report contains sensitive financial information and should be treated as confidential.</p>
        </div>
    </body>
    </html>
  `;
  
  const text = `
ADAF ${reportTypeTitle} - ${report.period}

Dear Stakeholder,

The ${reportTypeTitle.toLowerCase()} for period ${report.period} has been generated and is ready for review.

Report Details:
- Type: ${reportTypeTitle}
- Period: ${report.period}
- Generated: ${new Date(report.createdAt).toLocaleString()}
- File Size: ${(report.fileSizeBytes / 1024).toFixed(1)} KB
- SHA256: ${report.sha256}

${downloadUrl ? 
  `Download Link: ${downloadUrl}
  (Link expires in 72 hours for security purposes)`
  : 
  'The report is attached to this email as a PDF file.'
}

Report Contents:
${report.type === 'onepager' ? 
  '- Executive Summary\n- Key Performance Indicators (IRR, TVPI, MOIC, DPI, RVPI)\n- Net Asset Value and Cash Flow Analysis\n- Proof of Reserves Summary'
  :
  '- Comprehensive Performance Analysis\n- Detailed Methodology and Assumptions\n- Complete Proof of Reserves by Chain\n- Risk Management and Compliance Disclosures\n- Market Commentary and Outlook'
}

If you have any questions about this report, please don't hesitate to contact our team.

Best regards,
ADAF Institutional Team

---
This email was automatically generated by the ADAF Reporting System.
ADAF - Advanced Digital Asset Fund | reports@adaf.com
CONFIDENTIAL: This report contains sensitive financial information and should be treated as confidential.
  `;
  
  return { subject, html, text };
}

// =============================================================================
// Email Delivery Service
// =============================================================================

export async function sendReportByEmail(
  report: GeneratedReport,
  recipients: string[],
  pdfBuffer?: Buffer
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const emailConfig = getEmailConfig();
    
    // Validate configuration
    if (!emailConfig.smtpUser || !emailConfig.smtpPassword) {
      throw new Error('Email configuration incomplete - missing SMTP credentials');
    }
    
    // MOCK IMPLEMENTATION - Replace with actual nodemailer when package is installed
    console.log('📧 [MOCK] Sending email report...');
    console.log(`   To: ${recipients.join(', ')}`);
    console.log(`   Subject: ADAF ${report.type} - ${report.period}`);
    console.log(`   From: ${emailConfig.fromName} <${emailConfig.fromEmail}>`);
    console.log(`   Attachment: ${pdfBuffer ? 'PDF attached' : 'No attachment'}`);
    
    // Simulate email processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('SMTP server temporarily unavailable');
    }
    
    const mockMessageId = `mock-${Date.now()}@adaf.com`;
    
    return {
      success: true,
      messageId: mockMessageId
    };
    
  } catch (error) {
    console.error('Email delivery failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    };
  }
}

// =============================================================================
// S3 Delivery Service
// =============================================================================

export async function uploadReportToS3(
  report: GeneratedReport,
  pdfBuffer: Buffer,
  customPath?: string
): Promise<{
  success: boolean;
  s3Url?: string;
  publicUrl?: string;
  error?: string;
}> {
  try {
    const s3Config = getS3Config();
    
    // Validate configuration
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
      throw new Error('S3 configuration incomplete - missing AWS credentials');
    }
    
    // MOCK IMPLEMENTATION - Replace with actual AWS SDK when package is installed
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `ADAF_${report.type}_${report.period.replace(/\s+/g, '_')}.pdf`;
    const s3Key = customPath || `reports/${timestamp}/${report.id}/${fileName}`;
    
    console.log('☁️  [MOCK] Uploading to S3...');
    console.log(`   Bucket: ${s3Config.bucketName}`);
    console.log(`   Key: ${s3Key}`);
    console.log(`   Size: ${pdfBuffer.length} bytes`);
    console.log(`   Region: ${s3Config.region}`);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate occasional failures (3% chance)
    if (Math.random() < 0.03) {
      throw new Error('S3 upload failed: Access denied');
    }
    
    // Mock URLs
    const mockS3Url = `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${s3Key}`;
    const mockSignedUrl = `${mockS3Url}?AWSAccessKeyId=MOCK&Expires=${Date.now() + s3Config.urlExpirationHours * 3600 * 1000}&Signature=mockSignature`;
    
    return {
      success: true,
      s3Url: mockS3Url,
      publicUrl: mockSignedUrl
    };
    
  } catch (error) {
    console.error('S3 upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown S3 error'
    };
  }
}

// =============================================================================
// Unified Delivery Service
// =============================================================================

export interface DeliveryOptions {
  method: 'email' | 's3' | 'both';
  recipients: string[];
  customS3Path?: string;
  includeAttachment?: boolean; // For email: attach PDF vs. send download link
}

export interface DeliveryResult {
  success: boolean;
  email?: {
    success: boolean;
    messageId?: string;
    error?: string;
  };
  s3?: {
    success: boolean;
    s3Url?: string;
    publicUrl?: string;
    error?: string;
  };
  error?: string;
}

export async function deliverReport(
  report: GeneratedReport,
  pdfBuffer: Buffer,
  options: DeliveryOptions
): Promise<DeliveryResult> {
  const result: DeliveryResult = { success: false };
  
  try {
    if (options.method === 's3' || options.method === 'both') {
      // Upload to S3
      const s3Result = await uploadReportToS3(report, pdfBuffer, options.customS3Path);
      result.s3 = s3Result;
      
      if (options.method === 'both' && s3Result.success) {
        // Send email with download link
        // The email template with download link will be generated inside sendReportByEmail
        const emailResult = await sendReportByEmail(
          report, 
          options.recipients
        );
        result.email = emailResult;
        
        result.success = s3Result.success && emailResult.success;
      } else {
        result.success = s3Result.success;
      }
    } else if (options.method === 'email') {
      // Send email with attachment
      const emailResult = await sendReportByEmail(
        report, 
        options.recipients, 
        options.includeAttachment ? pdfBuffer : undefined
      );
      result.email = emailResult;
      result.success = emailResult.success;
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Delivery failed';
  }
  
  return result;
}

// =============================================================================
// Configuration Validation
// =============================================================================

export function validateDeliveryConfiguration(): {
  email: boolean;
  s3: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let emailValid = false;
  let s3Valid = false;
  
  try {
    const emailConfig = getEmailConfig();
    if (emailConfig.smtpUser && emailConfig.smtpPassword && emailConfig.smtpHost) {
      emailValid = true;
    } else {
      errors.push('Email configuration incomplete: missing SMTP credentials');
    }
  } catch (error) {
    errors.push(`Email configuration error: ${error}`);
  }
  
  try {
    const s3Config = getS3Config();
    if (s3Config.accessKeyId && s3Config.secretAccessKey && s3Config.bucketName) {
      s3Valid = true;
    } else {
      errors.push('S3 configuration incomplete: missing AWS credentials or bucket name');
    }
  } catch (error) {
    errors.push(`S3 configuration error: ${error}`);
  }
  
  return {
    email: emailValid,
    s3: s3Valid,
    errors
  };
}