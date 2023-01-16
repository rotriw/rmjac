
import { Route } from "../handle"
import { param } from "../utils/decorate"
import {User, UserInterface} from "../model/user";
import {connect} from "mongoose";
import {sha512} from "js-sha512";
import {Token} from "../model/token";
import {v4 as uuidv4} from 'uuid';

export class SignInHandler {
    async get() {

    }
    @param('username')
    @param('password')
    async postCheck(username :string, password :string) {
        let func = async() => { return new Promise(resolve => {
            User.findOne({username}, function (error, data) {
                resolve({error, data})
            })
        })};
        let us :any = await func();
        if (us.error != null) {
            return {
                status: 'failed',
                code: 502,
                error: us.error.toString()
            }
        }
        if (sha512(password) === us.data.pwdSHA512) {
            let token = uuidv4();
            let newToken = new Token({
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

    @param('userid')
    @param('token')
    async postCheckToken(userid :number, token :string) {
        // TODO
    }
}

export class RegisterHandler {
    async get() {

    }
    @param('username')
    @param('password')
    @param('email')
    @param('description')
    @param('invite')
    async post(username :string, password :string, email :string, description :string = '', invite :string) {
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
        let finds = await User.findOne({'username': username});
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
        let us = await User.find().checkToken(id, token);
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

export function apply(ctx) {
    Route('login', '/login', SignInHandler);
    Route('umain', '/umain', UserAccountHandler);
    Route('register', '/register', RegisterHandler);
}
