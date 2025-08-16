import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { resolve } from 'node:path';
import { Environment } from '../shared/environment';
import { createDefaultLambdaProps } from './default-lambda-props';
import { toValidSsmParameterName } from './to-valid-ssm-parameter-name';

export interface ExampleStackProps extends StackProps {
  environment: Environment;
  serviceName: string;
  build: {
    minify: boolean;
    sourceMapMode: SourceMapMode;
    tsconfig: string;
  };
}

export class ExampleStack extends Stack {
  constructor(scope: Construct, id: string, props: ExampleStackProps) {
    const { environment, serviceName, build, ...stackProps } = props;

    super(scope, id, stackProps);

    // Sample Lambda to keep existing example behavior
    const exampleFunction = new NodejsFunction(this, 'ExampleFunction', {
      ...createDefaultLambdaProps({ environment, serviceName, build }),
      description: 'An example Lambda function.',
      entry: resolve(__dirname, '../src/example-handler.ts'),
      handler: 'exampleHandler',
    });

    new StringParameter(this, 'E2eExampleFunctionName', {
      parameterName: toValidSsmParameterName(
        `/e2e/${exampleFunction.node.path}`
      ),
      stringValue: exampleFunction.functionName,
    });

    // Minimal-cost PostgreSQL RDS instance for development
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Allow PostgreSQL access for development',
      allowAllOutbound: true,
    });
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Public PostgreSQL access for development'
    );

    const dbInstance = new rds.DatabaseInstance(this, 'DevPostgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSecurityGroup],
      publiclyAccessible: true,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      multiAz: false,
      backupRetention: Duration.days(0),
      deletionProtection: false,
      removalPolicy: RemovalPolicy.DESTROY,
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      databaseName: 'app',
    });

    new StringParameter(this, 'DbEndpointHostParam', {
      parameterName: toValidSsmParameterName(`/db/${serviceName}/endpointHost`),
      stringValue: dbInstance.instanceEndpoint.hostname,
    });
    if (dbInstance.secret) {
      new StringParameter(this, 'DbSecretArnParam', {
        parameterName: toValidSsmParameterName(`/db/${serviceName}/secretArn`),
        stringValue: dbInstance.secret.secretArn,
      });
    }

    // API for CRUD + query
    const api = new apigateway.RestApi(this, 'SheetsApi', {
      deployOptions: { stageName: 'dev' },
    });

    const commonEnv = {
      DB_HOST: dbInstance.instanceEndpoint.hostname,
      DB_PORT: String(dbInstance.instanceEndpoint.port),
      DB_NAME: 'app',
      DB_SECRET_ARN: dbInstance.secret?.secretArn ?? '',
    };

    const crudFunction = new NodejsFunction(this, 'RowsCrudFunction', {
      ...createDefaultLambdaProps({ environment, serviceName, build }),
      description: 'CRUD operations for rows stored in Postgres',
      entry: resolve(__dirname, '../src/db-crud-handler.ts'),
      handler: 'handler',
      environment: commonEnv,
    });
    dbInstance.secret?.grantRead(crudFunction);

    const queryFunction = new NodejsFunction(this, 'QueryFunction', {
      ...createDefaultLambdaProps({ environment, serviceName, build }),
      description: 'Run safe SELECT queries against Postgres',
      entry: resolve(__dirname, '../src/db-query-handler.ts'),
      handler: 'handler',
      environment: commonEnv,
    });
    dbInstance.secret?.grantRead(queryFunction);

    const rows = api.root.addResource('rows');
    rows.addMethod('GET', new apigateway.LambdaIntegration(crudFunction));
    rows.addMethod('POST', new apigateway.LambdaIntegration(crudFunction));

    const rowById = rows.addResource('{id}');
    rowById.addMethod('PATCH', new apigateway.LambdaIntegration(crudFunction));
    rowById.addMethod('DELETE', new apigateway.LambdaIntegration(crudFunction));

    const query = api.root.addResource('query');
    query.addMethod('POST', new apigateway.LambdaIntegration(queryFunction));

    new CfnOutput(this, 'ApiUrl', { value: api.url });
  }
}
