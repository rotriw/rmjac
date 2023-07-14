import { Transporter, createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import verifyTemplate from '../template/verifytemplate.html';
// import { verify } from '../utils/decorate';

class SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

export class VerifyOverwrite {
    username: string;
    link: string;
    errorlink: string;
}

export class EmailService {
    from: string;
    transporters: Map<string, Transporter>;
    configs: Map<string, SMTPConfig>;

    constructor(
        from: string,
        configs: Map<string, SMTPConfig>
    ) {
        this.from = from;
        this.transporters = new Map();
        this.configs = configs;
    }

    async init() {
        for (const key in this.configs) {
            this.transporters.set(key, createTransport(this.configs[key]));
        }
    }

    getTransporters(): string[] {
        return Array.from(this.transporters.keys());
    }

    async sendMail(
        transporter: string,
        mailOptions: Mail.Options
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.transporters
                .get(transporter)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .sendMail(mailOptions, (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(true);
                });
        });
    }

    // async sendTemplatedMail(
    //     transporter: string,
    //     to: string,
    //     type: 'verify',
    //     template: VerifyOverwrite
    // );

    async sendTemplatedMail(
        transporter: string,
        to: string,
        type: 'verify',
        template: VerifyOverwrite
    ) {
        let overwritten = '', subject = '';
        if (type === 'verify') {
            overwritten = verifyTemplate
                .replace(/<!--USERNAME-->/g, template.username)
                .replace(/<!--ERRORLINK-->/g, template.errorlink)
                .replace(/<!--LINK-->/g, template.link);
            subject = '验证您的邮箱';
        }

        const mailOptions: Mail.Options = {
            from: this.from,
            to,
            subject,
            html: overwritten,
        };

        return await this.sendMail(transporter, mailOptions);
    }
}

const from: string = global.Project.config?.email?.from || 'noreply';
const urls: Map<string, SMTPConfig> = global.Project.config?.smtp;


export async function apply() {
    await emails.init();
}

export const emails = new EmailService(from, urls);
