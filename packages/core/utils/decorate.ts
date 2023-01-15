export function param(params) {
    return function (target: any, methodName: string, descriptor: any) {
        if (descriptor.__param === undefined) {
            descriptor.__param = [];
            descriptor.originalMethod = descriptor.value;
        }
        descriptor.__param.unshift(params);
        descriptor.value = async function run(args: any) {
            return await descriptor.originalMethod.apply(this, descriptor.__param.map((key) => args[key]));
        };
    };
}
