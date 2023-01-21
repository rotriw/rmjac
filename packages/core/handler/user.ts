
import { Route } from "../handle"
import { param } from "../utils/decorate"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {User} from "../model/user";
import {sha512} from "js-sha512";
import {Token} from "../model/token";
import {v4 as uuidv4} from 'uuid';

interface LoginBackData {
    error: Error,
    data: {
        id: string,
        pwdSHA512: string,
    },
}

export class SignInHandler {
    async get() {
        return ;
    }
    @param('username')
    @param('password')
    async postCheck(username :string, password :string) {
        const func = async (): Promise<LoginBackData> => {
            return new Promise(resolve => {
                User.findOne({username}, function (error, data) {
                    resolve({error, data})
                })
            })
        }, us: LoginBackData = await func();
        if (us.error != null) {
            return {
                status: 'failed',
                code: 502,
                error: us.error.toString()
            }
        }
        if (sha512(password) === us.data.pwdSHA512) {
            const token = uuidv4();
            const newToken = new Token({
                uid: us.data.id,
                token: token
            })
            await newToken.save();
            return {
                status: 'success',
                token,
                uid: us.data.id
            }
        } else {
            return {
                status: 'failed',
                msg: 'can`t find correct data. plz check again.'
            }
        }
    }

}

export class RegisterHandler {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async get() {

    }
    @param('username')
    @param('password')
    @param('email')
    @param('description')
    @param('invite')
    async post(username :string, password :string, email :string, description  = '', invite :string) {
        const user = new User({
            username,
            pwdSHA512: sha512(password),
            email,
            description,
            ConnectionAccount: []
		})
		if (invite !== '') {
			return {
				'status': 'failed',
				'error': 'wrong invention.',
			};
		}
        const finds = await User.findOne({'username': username});
        if (finds !== null) {
            return {
				'status': 'failed',
				'error': 'same username',
			};
        }
        await user.save();
		return {
			'status': 'success',
		};
    }
}

export class UserAccountHandler {

    @param('id')
    @param('token')
    async postUpdateLuogu(id :number, token :string) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        await User.find().updateLuoguData(id, token);
    }


}

export function apply() {
    Route('login', '/login', SignInHandler);
    Route('umain', '/umain', UserAccountHandler);
    Route('register', '/register', RegisterHandler);
}
