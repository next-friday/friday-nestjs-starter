import {Pool} from "pg";
import {Test} from "@nestjs/testing";

import {DATABASE, DatabaseModule} from "./database.module.js";

describe("DatabaseModule", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refuses to start without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(
      Test.createTestingModule({
        imports: [DatabaseModule],
      }).compile(),
    ).rejects.toThrow("DATABASE_URL environment variable is required.");
  });

  it("provides a Drizzle database and closes its pool on shutdown", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost:5432/unused");

    const end = vi.spyOn(Pool.prototype, "end").mockResolvedValue();

    const moduleReference = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    expect(moduleReference.get(DATABASE)).toHaveProperty("execute");
    await moduleReference.close();
    expect(end).toHaveBeenCalledOnce();
  });
});
