import express from 'express';
import { ServiceAccount } from 'firebase-admin';
import * as admin from 'firebase-admin';
import * as googleServiceAccount from '../../service-account.json'
import { TwitterServer } from './twitter-server';
import * as jsonConfg from '../../app-config.json';
import { Config } from './../settings/config';

export class BaseHttpServer {
    config: Config = jsonConfg as Config;
    app: express.Express;
    port: number;
    twitterServer: TwitterServer;
    serviceAccount: ServiceAccount = googleServiceAccount as ServiceAccount;

    constructor() {
        this.port = this.config.serverConfig.port;
        this.app = express();
        admin.initializeApp({
            credential: admin.credential.cert(this.serviceAccount),
            databaseURL: this.config.appConfig.databaseUrl
        });
        this.init();
        this.twitterServer = new TwitterServer(this.app);
    }

    private init() {
        this.app.listen(this.port, this.listen);
    }

    private listen = () => {
        console.log(`Listening on port ${this.port}`);
    };

}