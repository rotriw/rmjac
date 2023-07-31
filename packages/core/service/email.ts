// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { Transporter, createTransport } from 'nodemailer';
// import Mail from 'nodemailer/lib/mailer';
// import verifyTemplate from '../template/verifytemplate.html';
// import { config, SMTPConfig } from 'rmjac-config';

// export class VerifyOverwrite {
//     username?: string;
//     link?: string;
//     errorlink?: string;
// }

// export class EmailService {
//     from: string;
//     transporters: Record<string, Transporter>;
//     configs: Record<string, SMTPConfig>;

//     constructor(
//         from: string,
//         configs: Record<string, SMTPConfig>
//     ) {
//         this.from = from;
//         this.transporters = {};
//         this.configs = configs;
//     }

//     async init() {
//         for (const key in this.configs) {
//             this.transporters[key] = createTransport(this.configs['key']);
//         }
//     }

//     getTransporters(): string[] {
//         return Array.from(Object.keys(this.transporters));
//     }

//     async sendMail(
//         transporter: string,
//         mailOptions: Mail.Options
//     ): Promise<boolean> {
//         return new Promise((resolve, reject) => {
//             // eslint-disable-next-line @typescript-eslint/no-unused-vars
//             this.transporters[transporter]?.sendMail(mailOptions, (err: any, res: any) => {
//                 if (err) {
//                     reject(err);
//                 }
//                 resolve(true);
//             });
//         });
//     }

//     // async sendTemplatedMail(
//     //     transporter: string,
//     //     to: string,
//     //     type: 'verify',
//     //     template: VerifyOverwrite
//     // );

//     async sendTemplatedMail(
//         transporter: string,
//         to: string,
//         type: 'verify',
//         template: VerifyOverwrite
//     ) {
//         let overwritten = '', subject = '';
//         if (type === 'verify') {
//             overwritten = verifyTemplate
//                 .replace(/<!--USERNAME-->/g, template.username as string)
//                 .replace(/<!--ERRORLINK-->/g, template.errorlink as string)
//                 .replace(/<!--LINK-->/g, template.link as string);
//             subject = '验证您的邮箱';
//         }

//         const mailOptions: Mail.Options = {
//             from: this.from,
//             to,
//             subject,
//             html: overwritten,
//         };

//         return await this.sendMail(transporter, mailOptions);
//     }
// }

// const from: string = config.email.from || 'noreply';
// const urls: Record<string, SMTPConfig> = config.smtp as Record<string, SMTPConfig>;


// export async function apply() {
//     await emails.init();
// }

// export const emails = new EmailService(from, urls);
