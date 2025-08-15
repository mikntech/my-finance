import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class CoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'TransactionsTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'gsi2',
      partitionKey: { name: 'gsi2pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi2sk', type: dynamodb.AttributeType.STRING },
    });
    table.addGlobalSecondaryIndex({
      indexName: 'gsi3',
      partitionKey: { name: 'gsi3pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi3sk', type: dynamodb.AttributeType.STRING },
    });

    const statementsBucket = new s3.Bucket(this, 'StatementsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: { minLength: 12 },
      mfa: cognito.Mfa.OFF,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // Hosted UI domain (uses prefix 'tem')
    const hostedDomain = new cognito.UserPoolDomain(this, 'UserPoolHostedDomain', {
      userPool,
      cognitoDomain: { domainPrefix: 'tem' },
    });

    // VPC with fixed egress IP via NAT Gateway (Elastic IP)
    const natEip = new ec2.CfnEIP(this, 'NatEip', { domain: 'vpc' });
    const vpc = new ec2.Vpc(this, 'Vpc', {
      natGatewayProvider: ec2.NatProvider.gateway({ eipAllocationIds: [natEip.attrAllocationId] }),
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC },
        { name: 'private-egress', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });
    vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });
    vpc.addGatewayEndpoint('S3Endpoint', { service: ec2.GatewayVpcEndpointAwsService.S3 });

    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../services/api/dist'),
      timeout: cdk.Duration.seconds(20),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: statementsBucket.bucketName,
        REGION: this.region,
        SALTEDGE_ID: process.env.SALTEDGE_ID ?? '',
        SALTEDGE_KEY: process.env.SALTEDGE_KEY ?? '',
        SALTEDGE_WEBHOOK_USER: process.env.SALTEDGE_WEBHOOK_USER ?? '',
        SALTEDGE_WEBHOOK_PASS: process.env.SALTEDGE_WEBHOOK_PASS ?? '',
        ALLOWED_ORIGIN: `https://app.the-libs.com`,
        SALTEDGE_CONSENT_SCOPES: process.env.SALTEDGE_CONSENT_SCOPES ?? '',
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    table.grantReadWriteData(apiHandler);
    statementsBucket.grantReadWrite(apiHandler);

    const api = new apigw.RestApi(this, 'Api', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
    });

    // Ensure CORS headers exist on 4XX/5XX (e.g., Cognito auth failures)
    new apigw.GatewayResponse(this, 'Default4XXCors', {
      restApi: api,
      type: apigw.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });
    new apigw.GatewayResponse(this, 'Default5XXCors', {
      restApi: api,
      type: apigw.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });
    const v1 = api.root.addResource('v1');
    const tx = v1.addResource('transactions');
    tx.addMethod('GET', new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    tx.addMethod('POST', new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    tx.addMethod('PUT', new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    const budgets = v1.addResource('budgets');
    budgets.addMethod('GET', new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    budgets.addMethod('PUT', new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    // Webhooks (no Cognito auth; Basic Auth is enforced in handler)
    const webhooks = v1.addResource('webhooks');
    const saltedge = webhooks.addResource('saltedge');
    saltedge.addMethod('POST', new apigw.LambdaIntegration(apiHandler));
    const providers = saltedge.addResource('providers');
    providers.addMethod('POST', new apigw.LambdaIntegration(apiHandler));

    // Connect flow
    const connect = v1.addResource('connect');
    const start = connect.addResource('start');
    start.addMethod('POST', new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    const nightly = new events.Rule(this, 'NightlyRule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '2' }),
    });
    nightly.addTarget(new targets.LambdaFunction(apiHandler));

    // DNS & Certificates (custom domains)
    const rootDomain = 'the-libs.com';
    const hostedZoneId = 'Z01810511E7Q1XG0MN91O';
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId,
      zoneName: rootDomain,
    });

    // Frontend hosting (S3 + CloudFront) with custom domain app.the-libs.com
    const webBucket = new s3.Bucket(this, 'WebBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const oai = new cloudfront.OriginAccessIdentity(this, 'WebOAI');
    webBucket.grantRead(oai);
    const appDomain = `app.${rootDomain}`;
    const appCert = new acm.DnsValidatedCertificate(this, 'AppCert', {
      domainName: appDomain,
      hostedZone,
      region: 'us-east-1',
    });
    const distro = new cloudfront.Distribution(this, 'WebDistro', {
      defaultBehavior: {
        origin: new origins.S3Origin(webBucket, { originAccessIdentity: oai }),
      },
      defaultRootObject: 'index.html',
      domainNames: [appDomain],
      certificate: appCert,
      errorResponses: [
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });
    new route53.ARecord(this, 'AppAliasRecord', {
      zone: hostedZone,
      recordName: appDomain,
      target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distro)),
    });

    new s3deploy.BucketDeployment(this, 'DeployWeb', {
      sources: [s3deploy.Source.asset('../web/dist')],
      destinationBucket: webBucket,
      distribution: distro,
      distributionPaths: ['/*'],
    });

    // User pool client with Hosted UI (OAuth) config, now that we know callback URLs
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      oAuth: {
        flows: { implicitCodeGrant: true, authorizationCodeGrant: true },
        callbackUrls: [
          `https://${appDomain}/callback`,
          `https://${distro.domainName}/callback`,
          'http://localhost:5173/callback',
        ],
        logoutUrls: [
          `https://${appDomain}/`,
          `https://${distro.domainName}/`,
          'http://localhost:5173/',
        ],
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
      generateSecret: false,
    });

    // API custom domain api.the-libs.com
    const apiDomainNameValue = `api.${rootDomain}`;
    const apiCert = new acm.DnsValidatedCertificate(this, 'ApiCert', {
      domainName: apiDomainNameValue,
      hostedZone,
    });
    const apiDomainName = new apigw.DomainName(this, 'ApiCustomDomain', {
      domainName: apiDomainNameValue,
      certificate: apiCert,
      securityPolicy: apigw.SecurityPolicy.TLS_1_2,
    });
    new apigw.BasePathMapping(this, 'ApiBasePath', {
      domainName: apiDomainName,
      restApi: api,
      stage: api.deploymentStage,
    });
    new route53.ARecord(this, 'ApiAliasRecord', {
      zone: hostedZone,
      recordName: apiDomainNameValue,
      target: route53.RecordTarget.fromAlias(new route53targets.ApiGatewayDomain(apiDomainName)),
    });

    new cdk.CfnOutput(this, 'StaticEgressIp', { value: natEip.attrPublicIp });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url ?? '' });
    new cdk.CfnOutput(this, 'ApiCustomDomainUrl', { value: `https://${apiDomainNameValue}` });
    new cdk.CfnOutput(this, 'CloudFrontUrl', { value: 'https://' + distro.domainName });
    new cdk.CfnOutput(this, 'AppDomain', { value: `https://${appDomain}` });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'HostedUiDomain', { value: hostedDomain.baseUrl() });
  }
}
