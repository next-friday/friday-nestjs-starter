import {NestFactory} from "@nestjs/core";

import {AppModule, ObserveInstrument} from "./app.module.js";
import {configureApp} from "./app.setup.js";

/**
 * Starts the HTTP server on `PORT` with the shared security baseline.
 */
async function bootstrap(): Promise<void> {
  const port = process.env.PORT;

  if (!port) {
    throw new Error("PORT environment variable is required.");
  }

  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  configureApp(app);
  await app.listen(port);
}

void bootstrap();
