import {randomUUID} from "node:crypto";
import type {IncomingMessage, ServerResponse} from "node:http";
import type {Options} from "pino-http";

/**
 * Log paths that may carry credentials or cardholder data (PCI DSS 3.3, 3.4, 10.3).
 * Pino replaces each value with `[REDACTED]` before the log line is written.
 */
export const LOG_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "*.password",
  "*.token",
  "*.secret",
  "*.pan",
  "*.cardNumber",
  "*.cvv",
  "*.cvc",
  "*.expiry",
];

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/u;

/**
 * Reuses a well-formed inbound `x-request-id` so logs correlate across services,
 * otherwise issues a new UUID, and echoes the ID on the response.
 * @param request - Incoming HTTP request.
 * @param response - Response that receives the `x-request-id` header.
 * @returns The request ID attached to every log line for this request.
 */
function requestId(request: IncomingMessage, response: ServerResponse): string {
  // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos -- bounded single character class, linear time.
  const inbound = request.headers[REQUEST_ID_HEADER];

  const id =
    typeof inbound === "string" && REQUEST_ID_PATTERN.test(inbound) ? inbound : randomUUID();

  response.setHeader(REQUEST_ID_HEADER, id);

  return id;
}

export const pinoHttpOptions: Options = {
  genReqId: requestId,
  redact: {
    paths: LOG_REDACT_PATHS,
    censor: "[REDACTED]",
  },
};
