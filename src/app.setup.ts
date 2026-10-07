import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import helmet from "helmet";
import {Logger} from "nestjs-pino";
import {ValidationPipe} from "@nestjs/common";
import type {INestApplication} from "@nestjs/common";

/**
 * Applies the security baseline shared by `main.ts` and the e2e suite: structured
 * logging, OWASP headers, strict input validation, CORS allow-list, and OpenAPI docs.
 * @param app - Application to configure before it starts listening.
 */
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );

  const corsOrigins = process.env.CORS_ORIGINS;

  if (corsOrigins) {
    app.enableCors({
      origin: corsOrigins.split(","),
    });
  }

  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle("friday-nestjs-starter").build(),
  );

  SwaggerModule.setup("docs", app, document);
}
