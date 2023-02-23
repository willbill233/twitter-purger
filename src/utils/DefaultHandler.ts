export class DefaultHandler {
    public static handleError(error: any, res: any) {
        if (!!error && !!error.message) {
            res.status(500).send(error.message);
            return;
        }
    }
}