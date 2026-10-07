import {drizzle, NodePgDatabase} from "drizzle-orm/node-postgres";
import {Global, Inject, Module, OnApplicationShutdown} from "@nestjs/common";
import {Pool} from "pg";

export const DATABASE = Symbol("DATABASE");
export type Database = NodePgDatabase;

const POOL = Symbol("POOL");

@Global()
@Module({
  exports: [DATABASE],
  providers: [
    {
      provide: POOL,
      useFactory: (): Pool => {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
          throw new Error("DATABASE_URL environment variable is required.");
        }

        return new Pool({
          connectionString,
        });
      },
    },
    {
      provide: DATABASE,
      inject: [POOL],
      useFactory: (pool: Pool): Database =>
        drizzle({
          client: pool,
        }),
    },
  ],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
