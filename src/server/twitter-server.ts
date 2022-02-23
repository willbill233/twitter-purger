import express, { response } from 'express';
import * as admin from 'firebase-admin';
import * as TwitterApi from 'twitter-api-v2';
import * as jsonConfg from '../../app-config.json';
import { Config } from './../settings/config';

export class TwitterServer {
    config: Config = jsonConfg as Config;
    app: express.Express;
    database: any;
    twitterClient: any;
    private callbackUrl = `${this.config.appConfig.host}${this.config.twitterServerConfig.callbackResource}`;

    constructor(app: express.Express) {
        this.app = app;
        this.twitterClient = new TwitterApi.default({
            clientId: this.config.twitterServerConfig.clientId,
            clientSecret: this.config.twitterServerConfig.clientSecret,
        });
        this.database = admin.firestore().doc(this.config.twitterServerConfig.tokenDocument);
        this.init();
    }

    private init() {
        this.app.get('/twitter/auth', this.twitterAuth);
        this.app.get('/twitter/callback', this.twitterCallback);
        this.app.get('/twitter/my-tweets', this.twitterGetUserTweets);
    }

    private twitterAuth = async (req: any, res: any) => {
        const { url, codeVerifier, state } = this.twitterClient.generateOAuth2AuthLink(this.callbackUrl,
            { scope: this.config.twitterServerConfig.apiScopes });
        try {
            await this.database.set({ codeVerifier, state });
        } catch (error) {
            if (!!error && error.message) {
                res.status(500).send(error.message);
                return;
            }
        }
        res.redirect(url);
    };

    private twitterCallback = async (req: any, res: any) => {
        const { state, code } = req.query;
        try {
            const dbSnapshot = await this.database.get()
            const {codeVerifier, state: storedState} = dbSnapshot.data();
            if (state !== storedState) {
                return res.status(400).send('Stored tokens do not match.');
            }
            const {
                client: loggedClient,
                accessToken
            } = await this.twitterClient.loginWithOAuth2({
                code,
                codeVerifier,
                redirectUri: this.callbackUrl
            });

            await this.database.set({ accessToken });
            console.log('Authenticated successfully... redirecting')
            res.redirect(this.config.twitterServerConfig.postAuthenticationRedirect);
        } catch (error) {
            if (!!error && !!error.message) {
                res.status(500).send(error.message);
                return;
            }
        }
    };

    private twitterGetUserTweets = async (req: any, res: any) => {
        res.send('Hello World');
    };

}