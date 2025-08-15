# My Finance (Israel) – Serverless MVP

This is a serverless personal finance MVP targeted for Israel, with AWS CDK (TypeScript), an API on Lambda, and a React + Vite web app with RTL support.

## Layout

```
my-finance/
  infra/              # CDK app (TypeScript)
  services/
    api/              # Lambda handlers (Node 20)
  web/                # React + Vite app (TypeScript)
  shared/             # (optional) shared types/utilities
```

## Quick start

Prereqs:

- Node.js 20+
- AWS CLI configured
- CDK v2 globally: `npm i -g aws-cdk`

Steps:

1. Install dependencies

```
# Infra (CDK)
cd infra
npm i

# Lambda service
cd ../services/api
npm i

# Web
cd ../../web
npm i
```

2. Build web (creates `web/dist`)

```
npm run build
```

3. Bootstrap and deploy the infra (from `infra`):

```
cd ../infra
npm run cdk:bootstrap
npm run cdk:deploy
```

4. From the stack outputs, note:

- `CloudFrontUrl` (web hosting)
- `ApiUrl`
- `UserPoolId`, `UserPoolClientId`

5. Configure web `.env` with your values (see `.env.example`), rebuild and redeploy (CDK `BucketDeployment` ships `web/dist`):

```
cd ../web
cp .env.example .env           # edit values
npm run build
cd ../infra
npm run cdk:deploy
```

## Local dev (web)

- The web app expects environment variables `VITE_API_URL` (and later Cognito settings if you use Hosted UI callbacks).
- For local dev, set `VITE_API_URL` to your API URL and run:

```
cd web
npm run dev
```

## Notes

- The Lambda currently includes minimal Transactions GET/POST and Budgets GET/PUT placeholder.
- Cognito Hosted UI is enabled; configure callback/logout URLs post-deploy to include your CloudFront URL for production redirects.
