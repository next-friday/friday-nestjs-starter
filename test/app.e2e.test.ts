import {INestApplication} from "@nestjs/common";
import request from "supertest";
import {Test, TestingModule} from "@nestjs/testing";
import type {Server} from "node:http";

import {AppModule} from "./../src/app.module.js";
import {configureApp} from "./../src/app.setup.js";

const ALLOWED_ORIGIN = "https://app.example";

describe("AppController (e2e)", () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    vi.stubEnv("CORS_ORIGINS", ALLOWED_ORIGIN);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      bufferLogs: true,
    });

    configureApp(app);
    await app.init();
  });

  it("/ (GET)", async () => {
    const response = await request(app.getHttpServer()).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello World!");
  });

  it("/health (GET)", async () => {
    const response = await request(app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);

    expect(response.body).toStrictEqual({
      status: "ok",
    });
  });

  it("sets OWASP security headers and a request id", async () => {
    const response = await request(app.getHttpServer()).get("/");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-request-id"]).toMatch(/^[\w-]+$/u);
  });

  it("rate limits a client that exceeds its request budget", async () => {
    await app.listen(0);

    const server = await app.getUrl();

    await Promise.all(
      Array.from(
        {
          length: 100,
        },
        async () => request(server).get("/"),
      ),
    );

    const response = await request(server).get("/");

    expect(response.status).toBe(429);
  });

  it("allows only configured CORS origins", async () => {
    const allowed = await request(app.getHttpServer()).get("/").set("Origin", ALLOWED_ORIGIN);

    const denied = await request(app.getHttpServer())
      .get("/")
      .set("Origin", "https://evil.example");

    expect(allowed.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await app.close();
  });
});
