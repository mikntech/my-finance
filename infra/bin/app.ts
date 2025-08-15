#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CoreStack } from "../lib/core-stack";

const app = new cdk.App();
new CoreStack(app, "IlPFM-Core", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "eu-central-1" },
});
