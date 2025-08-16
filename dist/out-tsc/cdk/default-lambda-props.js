"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultLambdaProps = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const createDefaultLambdaProps = (options) => {
    const { environment, serviceName, build } = options;
    const { minify, sourceMapMode, tsconfig } = build;
    return {
        bundling: {
            charset: aws_lambda_nodejs_1.Charset.UTF8,
            format: aws_lambda_nodejs_1.OutputFormat.ESM,
            minify,
            sourceMap: true,
            sourceMapMode,
            tsconfig,
        },
        environment: {
            ENVIRONMENT: environment,
            POWERTOOLS_SERVICE_NAME: serviceName,
        },
        logFormat: aws_lambda_1.LogFormat.JSON,
        logRetention: aws_logs_1.RetentionDays.THREE_MONTHS,
        memorySize: 128,
        runtime: aws_lambda_1.Runtime.NODEJS_20_X,
        timeout: aws_cdk_lib_1.Duration.seconds(29),
        tracing: aws_lambda_1.Tracing.ACTIVE,
    };
};
exports.createDefaultLambdaProps = createDefaultLambdaProps;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1sYW1iZGEtcHJvcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9iYWNrZW5kLWNkay9jZGsvZGVmYXVsdC1sYW1iZGEtcHJvcHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQXVDO0FBQ3ZDLHVEQUFxRTtBQUNyRSxxRUFJdUM7QUFDdkMsbURBQXFEO0FBRzlDLE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxPQVF4QyxFQUFFLEVBQUU7SUFDSCxNQUFNLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsR0FBRyxPQUFPLENBQUM7SUFDcEQsTUFBTSxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLEdBQUcsS0FBSyxDQUFDO0lBRWxELE9BQU87UUFDTCxRQUFRLEVBQUU7WUFDUixPQUFPLEVBQUUsMkJBQU8sQ0FBQyxJQUFJO1lBQ3JCLE1BQU0sRUFBRSxnQ0FBWSxDQUFDLEdBQUc7WUFDeEIsTUFBTTtZQUNOLFNBQVMsRUFBRSxJQUFJO1lBQ2YsYUFBYTtZQUNiLFFBQVE7U0FDVDtRQUNELFdBQVcsRUFBRTtZQUNYLFdBQVcsRUFBRSxXQUFXO1lBQ3hCLHVCQUF1QixFQUFFLFdBQVc7U0FDckM7UUFDRCxTQUFTLEVBQUUsc0JBQVMsQ0FBQyxJQUFJO1FBQ3pCLFlBQVksRUFBRSx3QkFBYSxDQUFDLFlBQVk7UUFDeEMsVUFBVSxFQUFFLEdBQUc7UUFDZixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1FBQzVCLE9BQU8sRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDN0IsT0FBTyxFQUFFLG9CQUFPLENBQUMsTUFBTTtLQUN4QixDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBaENXLFFBQUEsd0JBQXdCLDRCQWdDbkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEdXJhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IExvZ0Zvcm1hdCwgUnVudGltZSwgVHJhY2luZyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHtcbiAgQ2hhcnNldCxcbiAgT3V0cHV0Rm9ybWF0LFxuICBTb3VyY2VNYXBNb2RlLFxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgeyBSZXRlbnRpb25EYXlzIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgRW52aXJvbm1lbnQgfSBmcm9tICcuLi9zaGFyZWQvZW52aXJvbm1lbnQnO1xuXG5leHBvcnQgY29uc3QgY3JlYXRlRGVmYXVsdExhbWJkYVByb3BzID0gKG9wdGlvbnM6IHtcbiAgZW52aXJvbm1lbnQ6IEVudmlyb25tZW50O1xuICBzZXJ2aWNlTmFtZTogc3RyaW5nO1xuICBidWlsZDoge1xuICAgIG1pbmlmeTogYm9vbGVhbjtcbiAgICBzb3VyY2VNYXBNb2RlOiBTb3VyY2VNYXBNb2RlO1xuICAgIHRzY29uZmlnOiBzdHJpbmc7XG4gIH07XG59KSA9PiB7XG4gIGNvbnN0IHsgZW52aXJvbm1lbnQsIHNlcnZpY2VOYW1lLCBidWlsZCB9ID0gb3B0aW9ucztcbiAgY29uc3QgeyBtaW5pZnksIHNvdXJjZU1hcE1vZGUsIHRzY29uZmlnIH0gPSBidWlsZDtcblxuICByZXR1cm4ge1xuICAgIGJ1bmRsaW5nOiB7XG4gICAgICBjaGFyc2V0OiBDaGFyc2V0LlVURjgsXG4gICAgICBmb3JtYXQ6IE91dHB1dEZvcm1hdC5FU00sXG4gICAgICBtaW5pZnksXG4gICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICBzb3VyY2VNYXBNb2RlLFxuICAgICAgdHNjb25maWcsXG4gICAgfSxcbiAgICBlbnZpcm9ubWVudDoge1xuICAgICAgRU5WSVJPTk1FTlQ6IGVudmlyb25tZW50LFxuICAgICAgUE9XRVJUT09MU19TRVJWSUNFX05BTUU6IHNlcnZpY2VOYW1lLFxuICAgIH0sXG4gICAgbG9nRm9ybWF0OiBMb2dGb3JtYXQuSlNPTixcbiAgICBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXMuVEhSRUVfTU9OVEhTLFxuICAgIG1lbW9yeVNpemU6IDEyOCxcbiAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18yMF9YLFxuICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMjkpLFxuICAgIHRyYWNpbmc6IFRyYWNpbmcuQUNUSVZFLFxuICB9O1xufTtcbiJdfQ==