/* eslint-disable @typescript-eslint/no-explicit-any */
import { ValidationError } from '../declare/error';
import { DefaultType, Verify } from '../declare/type';

export function param(params, Type: any = DefaultType.Any) {
    return function(target: any, methodName: string, descriptor: any) {
        if (descriptor.__param === undefined) {
            descriptor.__param = [];
            descriptor.verify = {};
            descriptor.originalMethodParam = descriptor.value;
        }
        descriptor.verify[params] = Type;
        descriptor.__param.unshift(params);
        descriptor.value = async function run(args: any) {
            for (const i of descriptor.__param) {
                if (!Verify(descriptor.verify[i], args[i])) {
                    throw new ValidationError(descriptor.verify[i], i);
                }
            }
            return await descriptor.originalMethodParam.apply(
                this,
                descriptor.__param.map((key) => args[key])
            );
        };
    };
}


/**
 * @deprecated
 */
export function verify(param, Type) {
    return function(target: any, methodName: string, descriptor: any) {
        if (descriptor.verify === undefined) {
            descriptor.verify = {};
            descriptor.originalMethodVerify = descriptor.value;
            const codes = descriptor.value.toString();
            const paramList = codes.slice(codes.indexOf('(') + 1, codes.indexOf(')')).split(',');
            const paramNames = paramList.map((param) => param.trim());
            descriptor.paramNames = paramNames;
        }
        descriptor.verify[descriptor.paramNames.indexOf(param)] = Type || DefaultType[Type?.toString()];
        descriptor.value = async function run(...args) {
            for (const i in descriptor.verify) {
                if (!Verify(descriptor.verify[i], args[i])) {
                    throw new ValidationError(descriptor.verify[i]);
                }
            }
            return await descriptor.originalMethodVerify.apply(this, args);
        };
    };
}
