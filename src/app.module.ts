import {APP_GUARD} from "@nestjs/core";
import {createObserveModule} from "@nestjs/observe";
import {LoggerModule} from "nestjs-pino";
import {Module} from "@nestjs/common";
import {ThrottlerGuard, ThrottlerModule} from "@nestjs/throttler";

import {AppController} from "./app.controller.js";
import {AppService} from "./app.service.js";
import {DatabaseModule} from "./database/database.module.js";
import {HealthController} from "./health/health.controller.js";
import {pinoHttpOptions} from "./logging.js";

const {ObserveInstrument, ObserveModule} = createObserveModule();

export {ObserveInstrument};
@Module({
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    DatabaseModule,
    LoggerModule.forRoot({
      pinoHttp: pinoHttpOptions,
    }),
    // Per-client request budget; tune per route with @Throttle() or @SkipThrottle().
    ThrottlerModule.forRoot([
      {
        limit: 100,
        ttl: 60_000,
      },
    ]),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: "YOUR_APP_KEY",
      appSecret: "YOUR_APP_SECRET",
      serviceId: "friday-nestjs-starter",
    }),
  ],
})
export class AppModule {}
