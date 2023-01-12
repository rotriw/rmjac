
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
            console.log('tst');
            User.findOne({username}, function (error, data) {
                resolve({error, data})
            })
        })};
        let us :any = await func();
        console.log(us);
        if (us.error != null) {
            return {
                status: 'failed',
                code: 502,
                error: us.error.toString()
            }
        }
        console.log(us, sha512(password));
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
        await connect(global.RMJ.dbURL || 'mongodb://localhost/rmjac');
        const user = new User({
            username,
            pwdSHA512: sha512(password),
            email,
            description,
            ConnectionAccount: []
        })
        let finds = await User.findOne({'username': username});
        console.log(finds);
        if (finds !== null) {
            return ;
        }
        await user.save();
    }
}

export function apply(ctx) {
    Route('login', '/login', SignInHandler);
    Route('register', '/register', RegisterHandler);
}
