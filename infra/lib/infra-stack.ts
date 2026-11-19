
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const requestsApi = new apigateway.RestApi(this, 'RequestsApi', {
      restApiName: 'mesa-solicitudes-api',
      description: 'API para gestionar solicitudes por sucursal',
      deployOptions: {
        stageName: 'dev',
      },
    });

    const requestsFunction = new lambda.Function(this, 'RequestsFunction', {
      functionName: 'mesa-solicitudes-api',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => ({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            message: 'Infraestructura de Mesa de Solicitudes disponible',
            path: event.path,
          }),
        });
      `),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
    });

    requestsApi.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(requestsFunction),
      anyMethod: true,
    });

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: undefined,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'RequestsApiUrl', {
      value: requestsApi.url,
      description: 'URL de la API de solicitudes',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Bucket S3 para alojar los archivos del frontend',
    });
  }
}
