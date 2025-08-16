"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleStack = void 0;
const tslib_1 = require("tslib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const ec2 = tslib_1.__importStar(require("aws-cdk-lib/aws-ec2"));
const apigateway = tslib_1.__importStar(require("aws-cdk-lib/aws-apigateway"));
const rds = tslib_1.__importStar(require("aws-cdk-lib/aws-rds"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_ssm_1 = require("aws-cdk-lib/aws-ssm");
const node_path_1 = require("node:path");
const default_lambda_props_1 = require("./default-lambda-props");
const to_valid_ssm_parameter_name_1 = require("./to-valid-ssm-parameter-name");
class ExampleStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        const { environment, serviceName, build, ...stackProps } = props;
        super(scope, id, stackProps);
        // Sample Lambda to keep existing example behavior
        const exampleFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'ExampleFunction', {
            ...(0, default_lambda_props_1.createDefaultLambdaProps)({ environment, serviceName, build }),
            description: 'An example Lambda function.',
            entry: (0, node_path_1.resolve)(__dirname, '../src/example-handler.ts'),
            handler: 'exampleHandler',
        });
        new aws_ssm_1.StringParameter(this, 'E2eExampleFunctionName', {
            parameterName: (0, to_valid_ssm_parameter_name_1.toValidSsmParameterName)(`/e2e/${exampleFunction.node.path}`),
            stringValue: exampleFunction.functionName,
        });
        // Minimal-cost PostgreSQL RDS instance for development
        const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
        const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc,
            description: 'Allow PostgreSQL access for development',
            allowAllOutbound: true,
        });
        dbSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432), 'Public PostgreSQL access for development');
        const dbInstance = new rds.DatabaseInstance(this, 'DevPostgres', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_16,
            }),
            vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            securityGroups: [dbSecurityGroup],
            publiclyAccessible: true,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
            allocatedStorage: 20,
            storageType: rds.StorageType.GP3,
            multiAz: false,
            backupRetention: aws_cdk_lib_1.Duration.days(0),
            deletionProtection: false,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            credentials: rds.Credentials.fromGeneratedSecret('postgres'),
            databaseName: 'app',
        });
        new aws_ssm_1.StringParameter(this, 'DbEndpointHostParam', {
            parameterName: (0, to_valid_ssm_parameter_name_1.toValidSsmParameterName)(`/db/${serviceName}/endpointHost`),
            stringValue: dbInstance.instanceEndpoint.hostname,
        });
        if (dbInstance.secret) {
            new aws_ssm_1.StringParameter(this, 'DbSecretArnParam', {
                parameterName: (0, to_valid_ssm_parameter_name_1.toValidSsmParameterName)(`/db/${serviceName}/secretArn`),
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
        const crudFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'RowsCrudFunction', {
            ...(0, default_lambda_props_1.createDefaultLambdaProps)({ environment, serviceName, build }),
            description: 'CRUD operations for rows stored in Postgres',
            entry: (0, node_path_1.resolve)(__dirname, '../src/db-crud-handler.ts'),
            handler: 'handler',
            environment: commonEnv,
        });
        dbInstance.secret?.grantRead(crudFunction);
        const queryFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'QueryFunction', {
            ...(0, default_lambda_props_1.createDefaultLambdaProps)({ environment, serviceName, build }),
            description: 'Run safe SELECT queries against Postgres',
            entry: (0, node_path_1.resolve)(__dirname, '../src/db-query-handler.ts'),
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
        new aws_cdk_lib_1.CfnOutput(this, 'ApiUrl', { value: api.url });
    }
}
exports.ExampleStack = ExampleStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhhbXBsZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2JhY2tlbmQtY2RrL2Nkay9leGFtcGxlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSw2Q0FBb0Y7QUFDcEYsaUVBQTJDO0FBQzNDLCtFQUF5RDtBQUN6RCxpRUFBMkM7QUFDM0MscUVBQThFO0FBQzlFLGlEQUFzRDtBQUV0RCx5Q0FBb0M7QUFFcEMsaUVBQWtFO0FBQ2xFLCtFQUF3RTtBQVl4RSxNQUFhLFlBQWEsU0FBUSxtQkFBSztJQUNyQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLE1BQU0sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxHQUFHLFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUVqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUU3QixrREFBa0Q7UUFDbEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUNsRSxHQUFHLElBQUEsK0NBQXdCLEVBQUMsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ2hFLFdBQVcsRUFBRSw2QkFBNkI7WUFDMUMsS0FBSyxFQUFFLElBQUEsbUJBQU8sRUFBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUM7WUFDdEQsT0FBTyxFQUFFLGdCQUFnQjtTQUMxQixDQUFDLENBQUM7UUFFSCxJQUFJLHlCQUFlLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2xELGFBQWEsRUFBRSxJQUFBLHFEQUF1QixFQUFDLFFBQVEsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUMzRSxXQUFXLEVBQUUsZUFBZSxDQUFDLFlBQVk7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsdURBQXVEO1FBQ3ZELE1BQU0sR0FBRyxHQUFHLEdB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LENBQUMsQ0FBQyxDQUFDO1FBQzNFLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFNUUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUV6RSxJQUFJLHVCQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUNwRCxDQUFDO0NBQ0Y7QUExR0Qsb0NBMEdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2ZuT3V0cHV0LCBEdXJhdGlvbiwgUmVtb3ZhbFBvbGljeSwgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uLCBTb3VyY2VNYXBNb2RlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0IHsgU3RyaW5nUGFyYW1ldGVyIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnQgfSBmcm9tICcuLi9zaGFyZWQvZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgY3JlYXRlRGVmYXVsdExhbWJkYVByb3BzIH0gZnJvbSAnLi9kZWZhdWx0LWxhbWJkYS1wcm9wcyc7XG5pbXBvcnQgeyB0b1ZhbGlkU3NtUGFyYW1ldGVyTmFtZSB9IGZyb20gJy4vdG8tdmFsaWQtc3NtLXBhcmFtZXRlci1uYW1lJztcblxuZXhwb3J0IGludGVyZmFjZSBFeGFtcGxlU3RhY2tQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQ7XG4gIHNlcnZpY2VOYW1lOiBzdHJpbmc7XG4gIGJ1aWxkOiB7XG4gICAgbWluaWZ5OiBib29sZWFuO1xuICAgIHNvdXJjZU1hcE1vZGU6IFNvdXJjZU1hcE1vZGU7XG4gICAgdHNjb25maWc6IHN0cmluZztcbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIEV4YW1wbGVTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEV4YW1wbGVTdGFja1Byb3BzKSB7XG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgc2VydmljZU5hbWUsIGJ1aWxkLCAuLi5zdGFja1Byb3BzIH0gPSBwcm9wcztcblxuICAgIHN1cGVyKHNjb3BlLCBpZCwgc3RhY2tQcm9wcyk7XG5cbiAgICAvLyBTYW1wbGUgTGFtYmRhIHRvIGtlZXAgZXhpc3RpbmcgZXhhbXBsZSBiZWhhdmlvclxuICAgIGNvbnN0IGV4YW1wbGVGdW5jdGlvbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnRXhhbXBsZUZ1bmN0aW9uJywge1xuICAgICAgLi4uY3JlYXRlRGVmYXVsdExhbWJkYVByb3BzKHsgZW52aXJvbm1lbnQsIHNlcnZpY2VOYW1lLCBidWlsZCB9KSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW4gZXhhbXBsZSBMYW1iZGEgZnVuY3Rpb24uJyxcbiAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgJy4uL3NyYy9leGFtcGxlLWhhbmRsZXIudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdleGFtcGxlSGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICBuZXcgU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdFMmVFeGFtcGxlRnVuY3Rpb25OYW1lJywge1xuICAgICAgcGFyYW1ldGVyTmFtZTogdG9WYWxpZFNzbVBhcmFtZXRlck5hbWUoYC9lMmUvJHtleGFtcGxlRnVuY3Rpb24ubm9kZS5wYXRofWApLFxuICAgICAgc3RyaW5nVmFsdWU6IGV4YW1wbGVGdW5jdGlvbi5mdW5jdGlvbk5hbWUsXG4gICAgfSk7XG5cbiAgICAvLyBNaW5pbWFsLWNvc3QgUG9zdGdyZVNRTCBSRFMgaW5zdGFuY2UgZm9yIGRldmVsb3BtZW50XG4gICAgY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsICdEZWZhdWx0VnBjJywgeyBpc0RlZmF1bHQ6IHRydWUgfSk7XG5cbiAgICBjb25zdCBkYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0RiU2VjdXJpdHlHcm91cCcsIHtcbiAgICAgIHZwYyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWxsb3cgUG9zdGdyZVNRTCBhY2Nlc3MgZm9yIGRldmVsb3BtZW50JyxcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgfSk7XG4gICAgZGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxuICAgICAgZWMyLlBvcnQudGNwKDU0MzIpLFxuICAgICAgJ1B1YmxpYyBQb3N0Z3JlU1FMIGFjY2VzcyBmb3IgZGV2ZWxvcG1lbnQnXG4gICAgKTtcblxuICAgIGNvbnN0IGRiSW5zdGFuY2UgPSBuZXcgcmRzLkRhdGFiYXNlSW5zdGFuY2UodGhpcywgJ0RldlBvc3RncmVzJywge1xuICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5wb3N0Z3Jlcyh7XG4gICAgICAgIHZlcnNpb246IHJkcy5Qb3N0Z3Jlc0VuZ2luZVZlcnNpb24uVkVSXzE2LFxuICAgICAgfSksXG4gICAgICB2cGMsXG4gICAgICB2cGNTdWJuZXRzOiB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyB9LFxuICAgICAgc2VjdXJpdHlHcm91cHM6IFtkYlNlY3VyaXR5R3JvdXBdLFxuICAgICAgcHVibGljbHlBY2Nlc3NpYmxlOiB0cnVlLFxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKGVjMi5JbnN0YW5jZUNsYXNzLlQ0RywgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTyksXG4gICAgICBhbGxvY2F0ZWRTdG9yYWdlOiAyMCxcbiAgICAgIHN0b3JhZ2VUeXBlOiByZHMuU3RvcmFnZVR5cGUuR1AzLFxuICAgICAgbXVsdGlBejogZmFsc2UsXG4gICAgICBiYWNrdXBSZXRlbnRpb246IER1cmF0aW9uLmRheXMoMCksXG4gICAgICBkZWxldGlvblByb3RlY3Rpb246IGZhbHNlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgY3JlZGVudGlhbHM6IHJkcy5DcmVkZW50aWFscy5mcm9tR2VuZXJhdGVkU2VjcmV0KCdwb3N0Z3JlcycpLFxuICAgICAgZGF0YWJhc2VOYW1lOiAnYXBwJyxcbiAgICB9KTtcblxuICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0RiRW5kcG9pbnRIb3N0UGFyYW0nLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiB0b1ZhbGlkU3NtUGFyYW1ldGVyTmFtZShgL2RiLyR7c2VydmljZU5hbWV9L2VuZHBvaW50SG9zdGApLFxuICAgICAgc3RyaW5nVmFsdWU6IGRiSW5zdGFuY2UuaW5zdGFuY2VFbmRwb2ludC5ob3N0bmFtZSxcbiAgICB9KTtcbiAgICBpZiAoZGJJbnN0YW5jZS5zZWNyZXQpIHtcbiAgICAgIG5ldyBTdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0RiU2VjcmV0QXJuUGFyYW0nLCB7XG4gICAgICAgIHBhcmFtZXRlck5hbWU6IHRvVmFsaWRTc21QYXJhbWV0ZXJOYW1lKGAvZGIvJHtzZXJ2aWNlTmFtZX0vc2VjcmV0QXJuYCksXG4gICAgICAgIHN0cmluZ1ZhbHVlOiBkYkluc3RhbmNlLnNlY3JldC5zZWNyZXRBcm4sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBUEkgZm9yIENSVUQgKyBxdWVyeVxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1NoZWV0c0FwaScsIHtcbiAgICAgIGRlcGxveU9wdGlvbnM6IHsgc3RhZ2VOYW1lOiAnZGV2JyB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tbW9uRW52ID0ge1xuICAgICAgREJfSE9TVDogZGJJbnN0YW5jZS5pbnN0YW5jZUVuZHBvaW50Lmhvc3RuYW1lLFxuICAgICAgREJfUE9SVDogU3RyaW5nKGRiSW5zdGFuY2UuaW5zdGFuY2VFbmRwb2ludC5wb3J0KSxcbiAgICAgIERCX05BTUU6ICdhcHAnLFxuICAgICAgREJfU0VDUkVUX0FSTjogZGJJbnN0YW5jZS5zZWNyZXQ/LnNlY3JldEFybiA/PyAnJyxcbiAgICB9O1xuXG4gICAgY29uc3QgY3J1ZEZ1bmN0aW9uID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdSb3dzQ3J1ZEZ1bmN0aW9uJywge1xuICAgICAgLi4uY3JlYXRlRGVmYXVsdExhbWJkYVByb3BzKHsgZW52aXJvbm1lbnQsIHNlcnZpY2VOYW1lLCBidWlsZCB9KSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ1JVRCBvcGVyYXRpb25zIGZvciByb3dzIHN0b3JlZCBpbiBQb3N0Z3JlcycsXG4gICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zcmMvZGItY3J1ZC1oYW5kbGVyLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDogY29tbW9uRW52LFxuICAgIH0pO1xuICAgIGRiSW5zdGFuY2Uuc2VjcmV0Py5ncmFudFJlYWQoY3J1ZEZ1bmN0aW9uKTtcblxuICAgIGNvbnN0IHF1ZXJ5RnVuY3Rpb24gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1F1ZXJ5RnVuY3Rpb24nLCB7XG4gICAgICAuLi5jcmVhdGVEZWZhdWx0TGFtYmRhUHJvcHMoeyBlbnZpcm9ubWVudCwgc2VydmljZU5hbWUsIGJ1aWxkIH0pLFxuICAgICAgZGVzY3JpcHRpb246ICdSdW4gc2FmZSBTRUxFQ1QgcXVlcmllcyBhZ2FpbnN0IFBvc3RncmVzJyxcbiAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgJy4uL3NyYy9kYi1xdWVyeS1oYW5kbGVyLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDogY29tbW9uRW52LFxuICAgIH0pO1xuICAgIGRiSW5zdGFuY2Uuc2VjcmV0Py5ncmFudFJlYWQocXVlcnlGdW5jdGlvbik7XG5cbiAgICBjb25zdCByb3dzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3Jvd3MnKTtcbiAgICByb3dzLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3J1ZEZ1bmN0aW9uKSk7XG4gICAgcm93cy5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihjcnVkRnVuY3Rpb24pKTtcblxuICAgIGNvbnN0IHJvd0J5SWQgPSByb3dzLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgcm93QnlJZC5hZGRNZXRob2QoJ1BBVENIJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3J1ZEZ1bmN0aW9uKSk7XG4gICAgcm93QnlJZC5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNydWRGdW5jdGlvbikpO1xuXG4gICAgY29uc3QgcXVlcnkgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncXVlcnknKTtcbiAgICBxdWVyeS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihxdWVyeUZ1bmN0aW9uKSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7IHZhbHVlOiBhcGkudXJsIH0pO1xuICB9XG59XG5cblxuIl19