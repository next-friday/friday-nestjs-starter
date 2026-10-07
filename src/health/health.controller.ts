import {ApiOkResponse, ApiServiceUnavailableResponse, ApiTags} from "@nestjs/swagger";
import {Controller, Get, Inject, ServiceUnavailableException} from "@nestjs/common";
import {sql} from "drizzle-orm";

import {DATABASE} from "../database/database.module.js";
import type {Database} from "../database/database.module.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  @ApiOkResponse({
    description: "The application and its database are reachable.",
  })
  @ApiServiceUnavailableResponse({
    description: "The database is unreachable.",
  })
  @Get()
  async check(): Promise<{status: "ok"}> {
    try {
      await this.database.execute(sql`select 1`);
    } catch (error) {
      throw new ServiceUnavailableException("Database is unreachable.", {
        cause: error,
      });
    }

    return {
      status: "ok",
    };
  }
}
