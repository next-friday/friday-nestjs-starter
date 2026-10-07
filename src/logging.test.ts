import {pino} from "pino";
import {Writable} from "node:stream";
import type {IncomingMessage, ServerResponse} from "node:http";

import {LOG_REDACT_PATHS, pinoHttpOptions} from "./logging.js";

/**
 * Collects log lines written by a Pino logger.
 * @returns The captured lines and the stream to pass to Pino.
 */
function capture(): {lines: string[]; stream: Writable} {
  const lines: string[] = [];

  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback): void {
      lines.push(chunk.toString());
      callback();
    },
  });

  return {
    lines,
    stream,
  };
}

/**
 * Runs the configured request-id generator against a stub request and response.
 * @param header - Inbound `x-request-id` value, if any.
 * @returns The generated id and the response header spy.
 */
function generateId(header: string | undefined): {id: string; setHeader: ReturnType<typeof vi.fn>} {
  const setHeader = vi.fn();

  const request = {
    headers: {
      "x-request-id": header,
    },
  } as unknown as IncomingMessage;

  const response = {
    setHeader,
  } as unknown as ServerResponse;

  const id = pinoHttpOptions.genReqId?.(request, response);

  if (typeof id !== "string") {
    throw new TypeError("Expected a string request id.");
  }

  return {
    id,
    setHeader,
  };
}

describe("logging", () => {
  it("redacts cardholder data and credentials before writing", () => {
    const {lines, stream} = capture();

    const logger = pino(
      {
        redact: {
          paths: LOG_REDACT_PATHS,
          censor: "[REDACTED]",
        },
      },
      stream,
    );

    logger.info({
      payment: {
        cardNumber: "4111111111111111",
        cvv: "123",
      },
      req: {
        headers: {
          authorization: "Bearer abc",
        },
      },
      user: {
        password: "hunter2",
      },
    });

    const [line] = lines;

    expect(line).not.toMatch(/4111111111111111|"123"|Bearer abc|hunter2/u);
    expect(line).toContain("[REDACTED]");
  });

  it("reuses a well-formed inbound request id and echoes it", () => {
    const {id, setHeader} = generateId("abc-123");

    expect(id).toBe("abc-123");
    expect(setHeader).toHaveBeenCalledWith("x-request-id", "abc-123");
  });

  it("replaces a malformed inbound request id to prevent log injection", () => {
    const {id} = generateId("bad\nid");

    expect(id).toMatch(/^[\da-f-]{36}$/u);
  });
});
