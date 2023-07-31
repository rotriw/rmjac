export class RError extends Error {
    public errorType = '';
    public errorParam: Array<string> | string = [];
}

export class ValidationError extends RError {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(valuename: {
        name?: string,
        constructor: {
            name?: string
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, ...args: any[]) {
        super(`Validation Error. ${valuename.name || valuename.constructor.name} have not correct validated.`);

        Object.assign(this.errorParam, args);
        this.errorParam.push((valuename.name || valuename.constructor.name) as unknown as string);
    }
    public errorParam: Array<string> = [];
    public errorType = 'validation';
}

export class DuplicateError extends RError {
    constructor(type: string) {
        super('Duplicate Error.');
        this.errorParam = type;
    }
    public errorType = 'duplicate';
    public errorParam = '';
}

export class NotFoundError extends RError {
    constructor(key: string, value: string | number) {
        super(`Not Found Error. ${key} = ${value} not found.`);
    }
    public errorType = 'exist';
}

export class PermError extends RError {
    constructor(id: string, value: string | number) {
        super(`Not Found Error. id:${id} do not have perm ${value}.`);
        this.errorParam.push(id, value.toString());
    }
    public errorType = 'perm';
    public errorParam: Array<string> = [];
}
