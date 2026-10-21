/* Vitest: server-only modules import 'server-only', which throws outside a React Server Component build. */
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
