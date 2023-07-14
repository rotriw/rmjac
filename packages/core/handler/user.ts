import { sha512 } from 'js-sha512';
import { Handler, Route } from '../handle';
import { UserSchema, user } from '../model/user';
import { RenderFromPage } from '../service/render';
import { param } from '../utils/decorate';
import { ValidationError } from '../declare/error';
import { token } from '../model/token';
import { DefaultType, StringType } from '../declare/type';

function randomString(length: number): string {
    const str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = length; i > 0; --i) {
        result += str[Math.floor(Math.random() * str.length)];
    }
    return result;
}

class RegisterHandler extends Handler {
    @param('username', new StringType([4, 20]))
    @param('password', DefaultType.String)
    @param('gender', DefaultType.String)
    @param('grade', DefaultType.Number)
    @param('email', DefaultType.Email)
    async postCreate(username: string, password: string, gender: string | number, grade: string, email: string) {
        try {
            let parsedGender = 0;
            if (typeof gender === 'string') {
                parsedGender = gender === 'female' ? 0 : 1;
            } else {
                parsedGender = gender;
            }
            const numGrade = parseInt(grade);
            const randomSalt = randomString(global.Project.config.salt.strength || 8);
            const configSalt = global.Project.config.salt.salt;

            const hashedPassword = sha512(password + randomSalt + configSalt);
            const data = await user.create({
                username,
                pwd: hashedPassword,
                salt: randomSalt,
                email,
                grade: numGrade,
                gender: parsedGender,
                gravatarLink: 'default',
                description: 'default',
            });
            this.ctx.body = {
                status: 'success',
                data,
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }

    // As Interface Demo
    /* deprecated */
    // @param('username')
    // @param('password')
    // @param('gender')
    // @param('grade')
    // @param('email')
    // async postCreateUI(username: string, password: string, gender: string | number, grade: string, email: string) {
    //     try {
    // let parsedGender = 0;
    // if (typeof gender === 'string') {
    //     parsedGender = gender === 'female' ? 0 : 1;
    // } else {
    //     parsedGender = gender;
    // }
    // const numGrade = parseInt(grade);
    // const data = await user.create({
    //     username,
    //     pwd: password,
    //     email,
    //     grade: numGrade,
    //     gender: parsedGender,
    //     gravatarLink: 'default',
    //     description: 'default',
    // });
    //         this.ctx.type = 'text/html';
    //         this.ctx.body = await RenderFromPage({
    //             type: 'back',
    //             template: 'Feedback',
    //             data: {
    //                 status: 'success',
    //                 title: `成功标题`,
    //                 msg: `成功文本。`,
    //                 links: [
    //                     {
    //                         title: 'link样式',
    //                         link: '/login',
    //                         style: 'light',
    //                     },
    //                 ],
    //             },
    //         });
    //     } catch (err) {
    //         console.log(err);
    //         this.ctx.type = 'text/html';
    //         this.ctx.body = await RenderFromPage({
    //             type: 'back',
    //             template: 'Feedback',
    //             status: 'error',
    //             data: {
    //                 status: 'error',
    //                 title: `错误`,
    //                 msg: `${err.errorType} Error. \n\n 若多次尝试仍然有问题请联系工作人员。`,
    //                 links: [
    //                     {
    //                         title: '返回登录',
    //                         link: '/login',
    //                     },
    //                     {
    //                         title: '联系帮助',
    //                         link: 'mailto:smallfang@rotriw.tech',
    //                         style: 'light',
    //                     },
    //                     {
    //                         title: '返回主页',
    //                         link: '/',
    //                         style: 'light',
    //                     },
    //                 ],
    //             },
    //         });
    //     }
    // }

    async get() {
        this.ctx.type = 'text/html';
        this.ctx.body = await RenderFromPage({
            type: 'back',
            template: 'Feedback',
            status: 'error',
            data: {
                status: 'error',
                title: '错误',
                msg: '该页面无法直接访问。',
                links: [
                    {
                        title: '登录页',
                        link: '/login',
                    },
                    {
                        title: '主页',
                        link: '/',
                        style: 'light',
                    },
                ],
            },
        });
    }
}

class LoginHandler extends Handler {

    @param('email', DefaultType.String)
    @param('password', DefaultType.String)
    async postLoginCheck(email: string, password: string) {
        try {
            let data: UserSchema;
            try {
                data = await user.getbyEmail(email);
            } catch (err) {
                data = await user.getbyUsername(email);
            }
            const configSalt = global.Project.config.salt.salt;
            const randomSalt = data.salt;
            const hashedPassword = sha512(password + randomSalt + configSalt);

            if (hashedPassword === data.pwd) {
                const tokenid = await token.create(data.id as number, 7 * 24 * 60 * 60);
                this.ctx.body = {
                    status: 'success',
                    data: {
                        username: data.username,
                        token: tokenid
                    }
                };
            } else {
                throw new ValidationError('any');
            }
        } catch (err) {
            console.error(err);
            // Treat exist error as validation error to prevent brute force
            if (err?.errorType === 'exist') {
                this.ctx.body = {
                    status: 'error',
                    type: 'validation',
                    param: err?.errorParam || '',
                };
            } else {
                this.ctx.body = {
                    status: 'error',
                    type: err?.errorType || 'unknown',
                    param: err?.errorParam || '',
                };
            }
        }
    }

    async get() {
        this.ctx.type = 'text/html';
        this.ctx.body = await RenderFromPage();
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function apply(ctx) {
    Route('SignUp', '/register', RegisterHandler);
    Route('SignUp-Id', '/register/:id', RegisterHandler);
    Route('SignIn', '/login', LoginHandler);
}
