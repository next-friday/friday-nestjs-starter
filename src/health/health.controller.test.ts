import {ServiceUnavailableException} from "@nestjs/common";
import {Test, TestingModule} from "@nestjs/testing";

import {DATABASE} from "../database/database.module.js";

import {HealthController} from "./health.controller.js";

describe("HealthController", () => {
  const execute = vi.fn();
  let healthController: HealthController;

  beforeEach(async () => {
    execute.mockReset();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DATABASE,
          useValue: {
            execute,
          },
        },
      ],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  it("reports ok after the database answers", async () => {
    execute.mockResolvedValue({
      rows: [],
    });

    await expect(healthController.check()).resolves.toStrictEqual({
      status: "ok",
    });

    expect(execute).toHaveBeenCalledOnce();
  });

  it("reports service unavailable when the database is unreachable", async () => {
    execute.mockRejectedValue(new Error("connection refused"));
    await expect(healthController.check()).rejects.toThrow(ServiceUnavailableException);
  });
});
