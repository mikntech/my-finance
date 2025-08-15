import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";

export class CoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "TransactionsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });
    table.addGlobalSecondaryIndex({
      indexName: "gsi1",
      partitionKey: { name: "gsi1pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    table.addGlobalSecondaryIndex({
      indexName: "gsi2",
      partitionKey: { name: "gsi2pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: dynamodb.AttributeType.STRING },
    });
    table.addGlobalSecondaryIndex({
      indexName: "gsi3",
      partitionKey: { name: "gsi3pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "gsi3sk", type: dynamodb.AttributeType.STRING },
    });

    const statementsBucket = new s3.Bucket(this, "StatementsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: { minLength: 12 },
      mfa: cognito.Mfa.OFF,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      authFlows: { userPassword: true },
      generateSecret: false,
    });

    const apiHandler = new lambda.Function(this, "ApiHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../services/api"),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: statementsBucket.bucketName,
        REGION: this.region,
      },
    });
    table.grantReadWriteData(apiHandler);
    statementsBucket.grantReadWrite(apiHandler);

    const api = new apigw.RestApi(this, "Api", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      },
    });
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(
      this,
      "Authorizer",
      {
        cognitoUserPools: [userPool],
      }
    );
    const v1 = api.root.addResource("v1");
    const tx = v1.addResource("transactions");
    tx.addMethod("GET", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    tx.addMethod("POST", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    const budgets = v1.addResource("budgets");
    budgets.addMethod("GET", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    budgets.addMethod("PUT", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    // Vehicles API
    const vehicles = v1.addResource("vehicles");
    vehicles.addMethod("GET", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    vehicles.addMethod("POST", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    const vehicleId = vehicles.addResource("{id}");
    const costs = vehicleId.addResource("costs");
    costs.addMethod("GET", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    costs.addMethod("POST", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    const summary = vehicleId.addResource("summary");
    summary.addMethod("GET", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    const metrics = vehicleId.addResource("metrics");
    metrics.addMethod("GET", new apigw.LambdaIntegration(apiHandler), {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });

    const nightly = new events.Rule(this, "NightlyRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "2" }),
    });
    nightly.addTarget(new targets.LambdaFunction(apiHandler));

    const webBucket = new s3.Bucket(this, "WebBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const oai = new cloudfront.OriginAccessIdentity(this, "WebOAI");
    webBucket.grantRead(oai);
    const distro = new cloudfront.Distribution(this, "WebDistro", {
      defaultBehavior: {
        origin: new origins.S3Origin(webBucket, { originAccessIdentity: oai }),
      },
      defaultRootObject: "index.html",
    });
    new s3deploy.BucketDeployment(this, "DeployWeb", {
      sources: [s3deploy.Source.asset("../web/dist")],
      destinationBucket: webBucket,
      distribution: distro,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(this, "ApiUrl", { value: api.url ?? "" });
    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: "https://" + distro.domainName,
    });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
  }
}
