import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { type Signal } from '@shared/schema';

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || 'kjohnne254@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_RECIPIENTS = ['kimaniwaweru1999@gmail.com', 'joshuamurimi1995@gmail.com'];

// Create a transport for SMTP if available
let transporter: nodemailer.Transporter | null = null;
if (EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true for 465, false for other ports
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
}

// Set up local storage for emails
const LOCAL_EMAIL_DIR = path.join(process.cwd(), 'local_emails');

// Create directory if it doesn't exist
if (!fs.existsSync(LOCAL_EMAIL_DIR)) {
  try {
    fs.mkdirSync(LOCAL_EMAIL_DIR, { recursive: true });
    console.log(`Created local email directory at ${LOCAL_EMAIL_DIR}`);
  } catch (error) {
    console.error('Failed to create local email directory:', error);
  }
}

export async function sendSignalEmail(signal: Signal): Promise<boolean> {
  try {
    // Format the timestamp to East African Time (EAT)
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    
    const timeString = timeFormatter.format(new Date(signal.timestamp));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0d1117; color: #f0f6fc; border-radius: 5px;">
        <h2 style="color: #388bfd; border-bottom: 1px solid #30363d; padding-bottom: 10px;">Deriv Trading Signal</h2>
        
        <div style="margin: 20px 0; padding: 15px; background: #161b22; border-radius: 5px;">
          <p><strong>Time (EAT):</strong> ${timeString}</p>
          <p><strong>Volatility Index:</strong> ${signal.volatilityName}</p>
          <p><strong>Strategy Type:</strong> ${signal.strategyType}</p>
          <p><strong>Strategy:</strong> ${signal.strategyName}</p>
          <p><strong>Entry Point:</strong> ${signal.entryPoint}</p>
          <p><strong>Predicted Signal:</strong> ${signal.predictedSignal}</p>
          <p><strong>Win Probability:</strong> ${signal.winProbability}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #161b22; border-radius: 5px;">
          <h3 style="color: #58a6ff; margin-top: 0;">Signal Reason:</h3>
          <p>${signal.signalReason}</p>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #8b949e; text-align: center; border-top: 1px solid #30363d; padding-top: 10px;">
          <p>This is an automated signal from Deriv Trading Bot. Please trade responsibly.</p>
        </div>
      </div>
    `;

    // Email metadata for local storage
    const emailMetadata = {
      id: signal.id,
      timestamp: new Date().toISOString(),
      from: `Deriv Trading Bot <${EMAIL_USER}>`,
      to: EMAIL_RECIPIENTS,
      subject: `Deriv Signal: ${signal.strategyType} - ${signal.volatilityName}`,
      signalData: signal,
    };
    
    // Save email to local storage
    const emailFilePath = path.join(LOCAL_EMAIL_DIR, `signal_${signal.id}_${timestamp}.html`);
    const metadataFilePath = path.join(LOCAL_EMAIL_DIR, `signal_${signal.id}_${timestamp}.json`);
    
    fs.writeFileSync(emailFilePath, emailContent);
    fs.writeFileSync(metadataFilePath, JSON.stringify(emailMetadata, null, 2));
    
    console.log(`Email saved locally: ${emailFilePath}`);
    
    // If SMTP is configured, also send via email
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: `"Deriv Trading Bot" <${EMAIL_USER}>`,
          to: EMAIL_RECIPIENTS.join(', '),
          subject: `Deriv Signal: ${signal.strategyType} - ${signal.volatilityName}`,
          html: emailContent,
        });
        
        console.log(`Email sent via SMTP: ${info.messageId}`);
      } catch (smtpError) {
        console.error('SMTP email delivery failed:', smtpError);
        // SMTP failure doesn't affect overall success since we have local storage
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error processing email:', error);
    return false;
  }
}

// Function to get all locally stored emails
export function getLocalEmails(): { path: string, metadata: any }[] {
  try {
    if (!fs.existsSync(LOCAL_EMAIL_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(LOCAL_EMAIL_DIR);
    const metadataFiles = files.filter(file => file.endsWith('.json'));
    
    const results: { path: string, metadata: any }[] = [];
    
    for (const file of metadataFiles) {
      const filePath = path.join(LOCAL_EMAIL_DIR, file);
      try {
        const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        results.push({ path: filePath, metadata });
      } catch (error) {
        console.error(`Error reading metadata file ${filePath}:`, error);
        // Skip invalid files
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error reading local emails directory:', error);
    return [];
  }
}

// Verify email transport configuration
export async function verifyEmailTransport(): Promise<boolean> {
  // Check if local email storage is available
  try {
    if (!fs.existsSync(LOCAL_EMAIL_DIR)) {
      fs.mkdirSync(LOCAL_EMAIL_DIR, { recursive: true });
    }
    
    // Test write access
    const testFile = path.join(LOCAL_EMAIL_DIR, 'test.txt');
    fs.writeFileSync(testFile, 'Test write access');
    fs.unlinkSync(testFile);
    
    console.log('Local email storage is working');
    
    // If SMTP is configured, verify that too
    if (transporter) {
      try {
        await transporter.verify();
        console.log('SMTP email transport verified successfully');
      } catch (error) {
        console.warn('SMTP email transport verification failed, falling back to local storage only');
      }
    } else {
      console.log('No SMTP configuration found, using local storage only');
    }
    
    return true;
  } catch (error) {
    console.error('Email system verification failed:', error);
    return false;
  }
}
