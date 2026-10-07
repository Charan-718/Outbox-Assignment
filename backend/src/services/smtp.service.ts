import nodemailer from 'nodemailer';
import { config } from '../config/env';

let transporter: nodemailer.Transporter | null = null;
let currentEtherealAccount: nodemailer.TestAccount | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) {
    return transporter;
  }

  if (config.ethereal.user && config.ethereal.pass) {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: config.ethereal.user,
        pass: config.ethereal.pass,
      },
    });
    console.log(`[SMTP] Using configured Ethereal account: ${config.ethereal.user}`);
    return transporter;
  }

  // Dynamically generate a test account if not configured
  try {
    console.log('[SMTP] Generating fresh Ethereal test account...');
    currentEtherealAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: currentEtherealAccount.user,
        pass: currentEtherealAccount.pass,
      },
    });
    console.log(`[SMTP] Ethereal test account created successfully:`);
    console.log(`   User: ${currentEtherealAccount.user}`);
    console.log(`   Web:  https://ethereal.email/login`);
    return transporter;
  } catch (err: any) {
    console.error('[SMTP] Failed to create Ethereal test account:', err.message);
    throw err;
  }
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const mailer = await getTransporter();

  const info = await mailer.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text || options.html,
    html: options.html || options.text,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`[SMTP] Message sent: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[SMTP] Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
