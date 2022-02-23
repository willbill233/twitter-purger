type AppConfig = {
    host: string;
    databaseUrl: string;
}
type ServerConfig = {
    port: number;
}

type TwitterServerConfig = {
    callbackResource: string;
    clientId: string;
    clientSecret: string;
    tokenDocument: string;
    apiScopes: string[];
    postAuthenticationRedirect: string;

}

export class Config {
    appConfig: AppConfig;
    serverConfig: ServerConfig;
    twitterServerConfig: TwitterServerConfig;
}