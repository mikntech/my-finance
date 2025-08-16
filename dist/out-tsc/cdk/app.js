"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentStacks = exports.createApp = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const constructs_1 = require("constructs");
const node_path_1 = require("node:path");
require("source-map-support/register");
const environment_1 = require("../shared/environment");
const example_stack_1 = require("./example-stack");
const to_valid_tag_1 = require("./to-valid-tag");
const createApp = () => {
    /*
      The AWS CDK team recommends to declare all stacks of all environments in the source code (Model all production stages in code - https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html#best-practices-apps).
      This guide explains the approach in more detail (https://taimos.de/blog/deploying-your-cdk-app-to-different-stages-and-environments).
      Environment variables are used to fixate the account and region at synthesis time (https://docs.aws.amazon.com/cdk/v2/guide/environments.html).
      They can be set via the '.env' file or via the shell in use.
    */
    const app = new aws_cdk_lib_1.App();
    const serviceName = 'backend-cdk';
    const devAccount = process.env['CDK_DEV_ACCOUNT'] ?? process.env['CDK_DEFAULT_ACCOUNT'];
    if (!devAccount) {
        throw new Error(`The Dev account isn't defined. Please set it via the '.env' file in the project directory.`);
    }
    const devRegion = process.env['CDK_DEV_REGION'] ?? process.env['CDK_DEFAULT_REGION'];
    if (!devRegion) {
        throw new Error(`The Dev region isn't defined. Please set it via the '.env' file in the project directory.`);
    }
    new EnvironmentStacks(app, environment_1.Environment.Dev, {
        environment: environment_1.Environment.Dev,
        serviceName,
        env: {
            account: devAccount,
            region: devRegion,
        },
        build: {
            minify: false,
            sourceMapMode: aws_lambda_nodejs_1.SourceMapMode.INLINE,
            tsconfig: (0, node_path_1.resolve)(__dirname, '../tsconfig.src.json'),
        },
    });
    const stageAccount = process.env['CDK_STAGE_ACCOUNT'] ?? process.env['CDK_DEFAULT_ACCOUNT'];
    if (!stageAccount) {
        throw new Error(`The Stage account isn't defined. Please set it via the '.env' file in the project directory.`);
    }
    const stageRegion = process.env['CDK_STAGE_REGION'] ?? process.env['CDK_DEFAULT_REGION'];
    if (!stageRegion) {
        throw new Error(`The Stage region isn't defined. Please set it via the '.env' file in the project directory.`);
    }
    new EnvironmentStacks(app, environment_1.Environment.Stage, {
        environment: environment_1.Environment.Stage,
        serviceName,
        env: {
            account: stageAccount,
            region: stageRegion,
        },
        build: {
            minify: true,
            /*
              Source maps bloat the Lambda bundle, which leads to longer cold start times.
              Therefore, it is preferable to
              1. Run the 'cdk synth' command.
              2. Upload the source maps to an error monitoring tool like Sentry.
              3. Remove the source maps.
              4. Run the 'cdk deploy --app cdk.out' command to skip the synthesize step during the deployment.
             */
            sourceMapMode: aws_lambda_nodejs_1.SourceMapMode.EXTERNAL,
            tsconfig: (0, node_path_1.resolve)(__dirname, '../tsconfig.src.json'),
        },
    });
    const prodAccount = process.env['CDK_PROD_ACCOUNT'] ?? process.env['CDK_DEFAULT_ACCOUNT'];
    if (!prodAccount) {
        throw new Error(`The Prod account isn't defined. Please set it via the '.env' file in the project directory.`);
    }
    const prodRegion = process.env['CDK_PROD_REGION'] ?? process.env['CDK_DEFAULT_REGION'];
    if (!prodRegion) {
        throw new Error(`The Prod region isn't defined. Please set it via the '.env' file in the project directory.`);
    }
    new EnvironmentStacks(app, environment_1.Environment.Prod, {
        environment: environment_1.Environment.Prod,
        serviceName,
        env: {
            account: prodAccount,
            region: prodRegion,
        },
        build: {
            minify: true,
            /*
              Source maps bloat the Lambda bundle, which leads to longer cold start times.
              Therefore, it is preferable to
              1. Run the 'cdk synth' command.
              2. Upload the source maps to an error monitoring tool like Sentry.
              3. Remove the source maps.
              4. Run the 'cdk deploy --app cdk.out' command to skip the synthesize step during the deployment.
             */
            sourceMapMode: aws_lambda_nodejs_1.SourceMapMode.EXTERNAL,
            tsconfig: (0, node_path_1.resolve)(__dirname, '../tsconfig.src.json'),
        },
    });
    return app;
};
exports.createApp = createApp;
class EnvironmentStacks extends constructs_1.Construct {
    constructor(scope, id, props) {
        const { environment, serviceName } = props;
        super(scope, id);
        const exampleStack = new example_stack_1.ExampleStack(this, `${serviceName.slice(0, 1).toUpperCase()}${serviceName.slice(1)}`, props);
        aws_cdk_lib_1.Tags.of(exampleStack).add('Environment', (0, to_valid_tag_1.toValidTag)(environment));
        aws_cdk_lib_1.Tags.of(exampleStack).add('App', (0, to_valid_tag_1.toValidTag)(serviceName));
    }
}
exports.EnvironmentStacks = EnvironmentStacks;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vYmFja2VuZC1jZGsvY2RrL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBd0M7QUFDeEMscUVBQThEO0FBQzlELDJDQUF1QztBQUN2Qyx5Q0FBb0M7QUFDcEMsdUNBQXFDO0FBQ3JDLHVEQUFvRDtBQUNwRCxtREFBa0U7QUFDbEUsaURBQTRDO0FBRXJDLE1BQU0sU0FBUyxHQUFHLEdBQVEsRUFBRTtJQUNqQzs7Ozs7TUFLRTtJQUVGLE1BQU0sR0FBRyxHQUFHLElBQUksaUJBQUcsRUFBRSxDQUFDO0lBQ3RCLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQztJQUVsQyxNQUFNLFVBQVUsR0FDZCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3ZFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNoQixNQUFNLElBQUksS0FBSyxDQUNiLDRGQUE0RixDQUM3RixDQUFDO0lBQ0osQ0FBQztJQUVELE1BQU0sU0FBUyxHQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDckUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2YsTUFBTSxJQUFJLEtBQUssQ0FDYiwyRkFBMkYsQ0FDNUYsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLGlCQUFpQixDQUFDLEdBQUcsRUFBRSx5QkFBVyxDQUFDLEdBQUcsRUFBRTtRQUMxQyxXQUFXLEVBQUUseUJBQVcsQ0FBQyxHQUFHO1FBQzVCLFdBQVc7UUFDWCxHQUFHLEVBQUU7WUFDSCxPQUFPLEVBQUUsVUFBVTtZQUNuQixNQUFNLEVBQUUsU0FBUztTQUNsQjtRQUNELEtBQUssRUFBRTtZQUNMLE1BQU0sRUFBRSxLQUFLO1lBQ2IsYUFBYSxF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LEVBQUUsRUFDakUsS0FBSyxDQUNOLENBQUM7UUFFRixrQkFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUEseUJBQVUsRUFBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLGtCQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBQSx5QkFBVSxFQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztDQUNGO0FBZkQsOENBZUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIFRhZ3MgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBTb3VyY2VNYXBNb2RlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCB7IEVudmlyb25tZW50IH0gZnJvbSAnLi4vc2hhcmVkL2Vudmlyb25tZW50JztcbmltcG9ydCB7IEV4YW1wbGVTdGFjaywgRXhhbXBsZVN0YWNrUHJvcHMgfSBmcm9tICcuL2V4YW1wbGUtc3RhY2snO1xuaW1wb3J0IHsgdG9WYWxpZFRhZyB9IGZyb20gJy4vdG8tdmFsaWQtdGFnJztcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUFwcCA9ICgpOiBBcHAgPT4ge1xuICAvKlxuICAgIFRoZSBBV1MgQ0RLIHRlYW0gcmVjb21tZW5kcyB0byBkZWNsYXJlIGFsbCBzdGFja3Mgb2YgYWxsIGVudmlyb25tZW50cyBpbiB0aGUgc291cmNlIGNvZGUgKE1vZGVsIGFsbCBwcm9kdWN0aW9uIHN0YWdlcyBpbiBjb2RlIC0gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Nkay92Mi9ndWlkZS9iZXN0LXByYWN0aWNlcy5odG1sI2Jlc3QtcHJhY3RpY2VzLWFwcHMpLlxuICAgIFRoaXMgZ3VpZGUgZXhwbGFpbnMgdGhlIGFwcHJvYWNoIGluIG1vcmUgZGV0YWlsIChodHRwczovL3RhaW1vcy5kZS9ibG9nL2RlcGxveWluZy15b3VyLWNkay1hcHAtdG8tZGlmZmVyZW50LXN0YWdlcy1hbmQtZW52aXJvbm1lbnRzKS5cbiAgICBFbnZpcm9ubWVudCB2YXJpYWJsZXMgYXJlIHVzZWQgdG8gZml4YXRlIHRoZSBhY2NvdW50IGFuZCByZWdpb24gYXQgc3ludGhlc2lzIHRpbWUgKGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9jZGsvdjIvZ3VpZGUvZW52aXJvbm1lbnRzLmh0bWwpLlxuICAgIFRoZXkgY2FuIGJlIHNldCB2aWEgdGhlICcuZW52JyBmaWxlIG9yIHZpYSB0aGUgc2hlbGwgaW4gdXNlLlxuICAqL1xuXG4gIGNvbnN0IGFwcCA9IG5ldyBBcHAoKTtcbiAgY29uc3Qgc2VydmljZU5hbWUgPSAnYmFja2VuZC1jZGsnO1xuXG4gIGNvbnN0IGRldkFjY291bnQgPVxuICAgIHByb2Nlc3MuZW52WydDREtfREVWX0FDQ09VTlQnXSA/PyBwcm9jZXNzLmVudlsnQ0RLX0RFRkFVTFRfQUNDT1VOVCddO1xuICBpZiAoIWRldkFjY291bnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlIERldiBhY2NvdW50IGlzbid0IGRlZmluZWQuIFBsZWFzZSBzZXQgaXQgdmlhIHRoZSAnLmVudicgZmlsZSBpbiB0aGUgcHJvamVjdCBkaXJlY3RvcnkuYFxuICAgICk7XG4gIH1cblxuICBjb25zdCBkZXZSZWdpb24gPVxuICAgIHByb2Nlc3MuZW52WydDREtfREVWX1JFR0lPTiddID8/IHByb2Nlc3MuZW52WydDREtfREVGQVVMVF9SRUdJT04nXTtcbiAgaWYgKCFkZXZSZWdpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlIERldiByZWdpb24gaXNuJ3QgZGVmaW5lZC4gUGxlYXNlIHNldCBpdCB2aWEgdGhlICcuZW52JyBmaWxlIGluIHRoZSBwcm9qZWN0IGRpcmVjdG9yeS5gXG4gICAgKTtcbiAgfVxuXG4gIG5ldyBFbnZpcm9ubWVudFN0YWNrcyhhcHAsIEVudmlyb25tZW50LkRldiwge1xuICAgIGVudmlyb25tZW50OiBFbnZpcm9ubWVudC5EZXYsXG4gICAgc2VydmljZU5hbWUsXG4gICAgZW52OiB7XG4gICAgICBhY2NvdW50OiBkZXZBY2NvdW50LFxuICAgICAgcmVnaW9uOiBkZXZSZWdpb24sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgbWluaWZ5OiBmYWxzZSxcbiAgICAgIHNvdXJjZU1hcE1vZGU6IFNvdXJjZU1hcE1vZGUuSU5MSU5FLFxuICAgICAgdHNjb25maWc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vdHNjb25maWcuc3JjLmpzb24nKSxcbiAgICB9LFxuICB9KTtcblxuICBjb25zdCBzdGFnZUFjY291bnQgPVxuICAgIHByb2Nlc3MuZW52WydDREtfU1RBR0VfQUNDT1VOVCddID8/IHByb2Nlc3MuZW52WydDREtfREVGQVVMVF9BQ0NPVU5UJ107XG4gIGlmICghc3RhZ2VBY2NvdW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFRoZSBTdGFnZSBhY2NvdW50IGlzbid0IGRlZmluZWQuIFBsZWFzZSBzZXQgaXQgdmlhIHRoZSAnLmVudicgZmlsZSBpbiB0aGUgcHJvamVjdCBkaXJlY3RvcnkuYFxuICAgICk7XG4gIH1cblxuICBjb25zdCBzdGFnZVJlZ2lvbiA9XG4gICAgcHJvY2Vzcy5lbnZbJ0NES19TVEFHRV9SRUdJT04nXSA/PyBwcm9jZXNzLmVudlsnQ0RLX0RFRkFVTFRfUkVHSU9OJ107XG4gIGlmICghc3RhZ2VSZWdpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlIFN0YWdlIHJlZ2lvbiBpc24ndCBkZWZpbmVkLiBQbGVhc2Ugc2V0IGl0IHZpYSB0aGUgJy5lbnYnIGZpbGUgaW4gdGhlIHByb2plY3QgZGlyZWN0b3J5LmBcbiAgICApO1xuICB9XG5cbiAgbmV3IEVudmlyb25tZW50U3RhY2tzKGFwcCwgRW52aXJvbm1lbnQuU3RhZ2UsIHtcbiAgICBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQuU3RhZ2UsXG4gICAgc2VydmljZU5hbWUsXG4gICAgZW52OiB7XG4gICAgICBhY2NvdW50OiBzdGFnZUFjY291bnQsXG4gICAgICByZWdpb246IHN0YWdlUmVnaW9uLFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIG1pbmlmeTogdHJ1ZSxcbiAgICAgIC8qXG4gICAgICAgIFNvdXJjZSBtYXBzIGJsb2F0IHRoZSBMYW1iZGEgYnVuZGxlLCB3aGljaCBsZWFkcyB0byBsb25nZXIgY29sZCBzdGFydCB0aW1lcy5cbiAgICAgICAgVGhlcmVmb3JlLCBpdCBpcyBwcmVmZXJhYmxlIHRvXG4gICAgICAgIDEuIFJ1biB0aGUgJ2NkayBzeW50aCcgY29tbWFuZC5cbiAgICAgICAgMi4gVXBsb2FkIHRoZSBzb3VyY2UgbWFwcyB0byBhbiBlcnJvciBtb25pdG9yaW5nIHRvb2wgbGlrZSBTZW50cnkuXG4gICAgICAgIDMuIFJlbW92ZSB0aGUgc291cmNlIG1hcHMuXG4gICAgICAgIDQuIFJ1biB0aGUgJ2NkayBkZXBsb3kgLS1hcHAgY2RrLm91dCcgY29tbWFuZCB0byBza2lwIHRoZSBzeW50aGVzaXplIHN0ZXAgZHVyaW5nIHRoZSBkZXBsb3ltZW50LlxuICAgICAgICovXG4gICAgICBzb3VyY2VNYXBNb2RlOiBTb3VyY2VNYXBNb2RlLkVYVEVSTkFMLFxuICAgICAgdHNjb25maWc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vdHNjb25maWcuc3JjLmpzb24nKSxcbiAgICB9LFxuICB9KTtcblxuICBjb25zdCBwcm9kQWNjb3VudCA9XG4gICAgcHJvY2Vzcy5lbnZbJ0NES19QUk9EX0FDQ09VTlQnXSA/PyBwcm9jZXNzLmVudlsnQ0RLX0RFRkFVTFRfQUNDT1VOVCddO1xuICBpZiAoIXByb2RBY2NvdW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFRoZSBQcm9kIGFjY291bnQgaXNuJ3QgZGVmaW5lZC4gUGxlYXNlIHNldCBpdCB2aWEgdGhlICcuZW52JyBmaWxlIGluIHRoZSBwcm9qZWN0IGRpcmVjdG9yeS5gXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHByb2RSZWdpb24gPVxuICAgIHByb2Nlc3MuZW52WydDREtfUFJPRF9SRUdJT04nXSA/PyBwcm9jZXNzLmVudlsnQ0RLX0RFRkFVTFRfUkVHSU9OJ107XG4gIGlmICghcHJvZFJlZ2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBUaGUgUHJvZCByZWdpb24gaXNuJ3QgZGVmaW5lZC4gUGxlYXNlIHNldCBpdCB2aWEgdGhlICcuZW52JyBmaWxlIGluIHRoZSBwcm9qZWN0IGRpcmVjdG9yeS5gXG4gICAgKTtcbiAgfVxuXG4gIG5ldyBFbnZpcm9ubWVudFN0YWNrcyhhcHAsIEVudmlyb25tZW50LlByb2QsIHtcbiAgICBlbnZpcm9ubWVudDogRW52aXJvbm1lbnQuUHJvZCxcbiAgICBzZXJ2aWNlTmFtZSxcbiAgICBlbnY6IHtcbiAgICAgIGFjY291bnQ6IHByb2RBY2NvdW50LFxuICAgICAgcmVnaW9uOiBwcm9kUmVnaW9uLFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIG1pbmlmeTogdHJ1ZSxcbiAgICAgIC8qXG4gICAgICAgIFNvdXJjZSBtYXBzIGJsb2F0IHRoZSBMYW1iZGEgYnVuZGxlLCB3aGljaCBsZWFkcyB0byBsb25nZXIgY29sZCBzdGFydCB0aW1lcy5cbiAgICAgICAgVGhlcmVmb3JlLCBpdCBpcyBwcmVmZXJhYmxlIHRvXG4gICAgICAgIDEuIFJ1biB0aGUgJ2NkayBzeW50aCcgY29tbWFuZC5cbiAgICAgICAgMi4gVXBsb2FkIHRoZSBzb3VyY2UgbWFwcyB0byBhbiBlcnJvciBtb25pdG9yaW5nIHRvb2wgbGlrZSBTZW50cnkuXG4gICAgICAgIDMuIFJlbW92ZSB0aGUgc291cmNlIG1hcHMuXG4gICAgICAgIDQuIFJ1biB0aGUgJ2NkayBkZXBsb3kgLS1hcHAgY2RrLm91dCcgY29tbWFuZCB0byBza2lwIHRoZSBzeW50aGVzaXplIHN0ZXAgZHVyaW5nIHRoZSBkZXBsb3ltZW50LlxuICAgICAgICovXG4gICAgICBzb3VyY2VNYXBNb2RlOiBTb3VyY2VNYXBNb2RlLkVYVEVSTkFMLFxuICAgICAgdHNjb25maWc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vdHNjb25maWcuc3JjLmpzb24nKSxcbiAgICB9LFxuICB9KTtcblxuICByZXR1cm4gYXBwO1xufTtcblxuZXhwb3J0IHR5cGUgRW52aXJvbm1lbnRTdGFja3NQcm9wcyA9IEV4YW1wbGVTdGFja1Byb3BzO1xuXG5leHBvcnQgY2xhc3MgRW52aXJvbm1lbnRTdGFja3MgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRW52aXJvbm1lbnRTdGFja3NQcm9wcykge1xuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHNlcnZpY2VOYW1lIH0gPSBwcm9wcztcblxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBleGFtcGxlU3RhY2sgPSBuZXcgRXhhbXBsZVN0YWNrKFxuICAgICAgdGhpcyxcbiAgICAgIGAke3NlcnZpY2VOYW1lLnNsaWNlKDAsIDEpLnRvVXBwZXJDYXNlKCl9JHtzZXJ2aWNlTmFtZS5zbGljZSgxKX1gLFxuICAgICAgcHJvcHNcbiAgICApO1xuXG4gICAgVGFncy5vZihleGFtcGxlU3RhY2spLmFkZCgnRW52aXJvbm1lbnQnLCB0b1ZhbGlkVGFnKGVudmlyb25tZW50KSk7XG4gICAgVGFncy5vZihleGFtcGxlU3RhY2spLmFkZCgnQXBwJywgdG9WYWxpZFRhZyhzZXJ2aWNlTmFtZSkpO1xuICB9XG59XG4iXX0=