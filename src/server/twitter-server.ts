import express, { response } from 'express';
import * as admin from 'firebase-admin';
import TwitterApi from 'twitter-api-v2';
import { DefaultHandler } from './../utils/DefaultHandler';
import { SentimentAnalyser } from '../sentiment-analyser/SentimentAnalyser'
import * as jsonConfg from '../../app-config.json';
import { Config } from './../settings/config';

export class TwitterServer {
    config: Config = jsonConfg as Config;
    app: express.Express;
    database: any;
    // need to have an app only and user-app client, look into documentation
    twitterClient: any;
    authenticatedClient: any;
    private callbackUrl = `${this.config.appConfig.host}${this.config.twitterServerConfig.callbackResource}`;
    private userTweetCache: any = {};
    private sentimentAnalyser: SentimentAnalyser = new SentimentAnalyser()
    private readonly AUTH_PATH: string = '/twitter/auth';
    private readonly CALLBACK_PATH: string = '/twitter/callback';
    private readonly MY_TWEETS_PATH: string = '/twitter/my-tweets';


    constructor(app: express.Express) {
        this.app = app;
        this.twitterClient = new TwitterApi({
            clientId: this.config.twitterServerConfig.clientId,
            clientSecret: this.config.twitterServerConfig.clientSecret,
        });
        this.database = admin.firestore().doc(this.config.twitterServerConfig.tokenDocument);
        this.init();
    }

    private init() {
        this.app.get(this.AUTH_PATH, this.twitterAuth);
        this.app.get(this.CALLBACK_PATH, this.twitterCallback);
        this.app.get(this.MY_TWEETS_PATH, this.twitterGetUserTweets);
    }

    private twitterAuth = async (req: any, res: any) => {
        const { url, codeVerifier, state } = this.twitterClient.generateOAuth2AuthLink(this.callbackUrl,
            { scope: this.config.twitterServerConfig.apiScopes });
        try {
            await this.database.set({ codeVerifier, state });
        } catch (error) {
            DefaultHandler.handleError(error, res);
        }
        res.redirect(url);
    };

    private twitterCallback = async (req: any, res: any) => {
        const { state, code } = req.query;
        try {
            const dbSnapshot = await this.database.get()
            const {codeVerifier, state: storedState} = dbSnapshot.data();
            if (!codeVerifier || !state || !storedState || !code) {
                return res.status(400).send('You denied the app or your session expired!');
              }
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
            this.authenticatedClient = loggedClient;
            console.log('Authenticated successfully... redirecting')
            res.redirect(this.config.twitterServerConfig.postAuthenticationRedirect);
        } catch (error) {
            DefaultHandler.handleError(error, res);
        }
    };

    private twitterGetUserTweets = async (req: any, res: any) => {
        try {
            if (!this.authenticatedClient) {
                res.redirect(`${this.config.appConfig.host}${this.AUTH_PATH}`)
                return;
            }
            const user = await this.authenticatedClient.v2.me({});
            let userTimeline = await this.authenticatedClient.v2.userTimeline(user.data.id, {});
            userTimeline = await userTimeline.fetchLast(1000);
            this.userTweetCache[user.data.id] = Object.fromEntries(
                userTimeline._realData.data.map((tweet: any) => [tweet.id, Object.assign(tweet, { sentimentScore: this.sentimentAnalyser.analyze(tweet.text)})])
             )
            res.send(this.userTweetCache);
        } catch (error) {
            DefaultHandler.handleError(error, res);
        }
    };

}