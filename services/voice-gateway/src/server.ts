/**
 * NexusFlo Voice gateway.
 *
 * Runs on Google Cloud Run as a persistent WebSocket service. Twilio streams
 * the caller's audio here; this service relays it to the OpenAI Realtime API
 * and streams the assistant's speech back. It never touches the database: it
 * calls the NexusFlo24 platform with the per-call token from the stream URL.
 *
 * Environment:
 *   PORT                      set by Cloud Run
 *   PLATFORM_FUNCTIONS_URL    https://<project>.supabase.co/functions/v1
 *   OPENAI_REALTIME_API_KEY   OpenAI key with Realtime access
 *   OPENAI_REALTIME_MODEL     optional model override
 */
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { platform } from "./platform.js";

const PORT = Number(process.env.PORT || 8080);
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
const REALTIME_URL = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`;

const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "nexusflo-voice-gateway" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname !== "/twilio") {
    socket.destroy();
    return;
  }
  const token = url.searchParams.get("token") || "";
  if (!token) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => handleCall(ws, token));
});

interface Turn {
  turn_index: number;
  speaker: "caller" | "assistant";
  content: string;
}

async function handleCall(twilioWs: WebSocket, token: string) {
  let streamSid = "";
  let session: any = null;
  let openai: WebSocket | null = null;
  const turns: Turn[] = [];
  let closed = false;

  const apiKey = process.env.OPENAI_REALTIME_API_KEY;
  if (!apiKey) {
    console.error("[gateway] OPENAI_REALTIME_API_KEY is not configured");
    twilioWs.close();
    return;
  }

  try {
    session = await platform.start(token);
  } catch (err) {
    console.error("[gateway] could not start session", err);
    twilioWs.close();
    return;
  }

  const callId: string = session.call.id;
  const addTurn = (speaker: Turn["speaker"], content: string) => {
    if (!content.trim()) return;
    turns.push({ turn_index: turns.length, speaker, content: content.trim() });
  };

  const finish = async (outcome?: string) => {
    if (closed) return;
    closed = true;
    try {
      if (turns.length) await platform.transcript(token, turns);
      await platform.end(token, {
        outcome,
        summary: turns
          .slice(-12)
          .map((t) => `${t.speaker === "caller" ? "Caller" : "Assistant"}: ${t.content}`)
          .join("\n")
          .slice(0, 4000),
      });
    } catch (err) {
      console.error("[gateway] could not close out call", err);
    }
    try {
      openai?.close();
    } catch { /* already closed */ }
    try {
      twilioWs.close();
    } catch { /* already closed */ }
  };

  openai = new WebSocket(REALTIME_URL, {
    headers: { Authorization: `Bearer ${apiKey}`, "OpenAI-Beta": "realtime=v1" },
  });

  openai.on("open", () => {
    openai!.send(JSON.stringify({
      type: "session.update",
      session: {
        instructions: session.assistant.instructions,
        voice: session.assistant.voice,
        modalities: ["text", "audio"],
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: { type: "server_vad" },
        tools: buildTools(session.permissions),
      },
    }));
    if (session.assistant.greeting) {
      openai!.send(JSON.stringify({
        type: "response.create",
        response: { instructions: `Greet the caller with: ${session.assistant.greeting}` },
      }));
    }
  });

  openai.on("message", async (raw) => {
    let event: any;
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (event.type === "response.audio.delta" && event.delta && streamSid) {
      twilioWs.send(JSON.stringify({ event: "media", streamSid, media: { payload: event.delta } }));
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.completed") {
      addTurn("caller", event.transcript || "");
      return;
    }
    if (event.type === "response.audio_transcript.done") {
      addTurn("assistant", event.transcript || "");
      return;
    }
    if (event.type === "response.function_call_arguments.done") {
      await runTool(event);
      return;
    }
    if (event.type === "error") {
      console.error("[gateway] realtime error", JSON.stringify(event));
    }
  });

  const runTool = async (event: any) => {
    const name = String(event.name || "");
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(event.arguments || "{}");
    } catch { /* keep empty */ }

    let output: unknown;
    try {
      if (name === "search_knowledge") {
        output = await platform.knowledge(token, String(input.query || ""));
      } else {
        output = await platform.tool(token, callId, name, input, `${callId}:${name}:${event.call_id}`);
      }
    } catch (err) {
      output = { ok: false, say: "Sorry, I couldn't complete that just now." };
      console.error(`[gateway] tool ${name} failed`, err);
    }

    openai!.send(JSON.stringify({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: event.call_id, output: JSON.stringify(output) },
    }));
    openai!.send(JSON.stringify({ type: "response.create" }));

    if (name === "transfer_call") await finish("transferred");
  };

  twilioWs.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.event === "start") {
      streamSid = msg.start?.streamSid || "";
      platform.event(token, "stream_started", { streamSid }, `${callId}:stream_started`).catch(() => {});
      return;
    }
    if (msg.event === "media" && openai?.readyState === WebSocket.OPEN) {
      openai.send(JSON.stringify({ type: "input_audio_buffer.append", audio: msg.media.payload }));
      return;
    }
    if (msg.event === "stop") {
      void finish();
    }
  });

  twilioWs.on("close", () => void finish());
  openai.on("close", () => void finish());
  openai.on("error", (err) => {
    console.error("[gateway] realtime socket error", err);
    void finish("failed");
  });
}

function buildTools(permissions: any) {
  const allowed: string[] = permissions?.tools ?? [];
  const tools: any[] = [];
  const add = (name: string, description: string, properties: Record<string, unknown>, required: string[]) => {
    if (!allowed.includes(name)) return;
    tools.push({
      type: "function",
      name,
      description,
      parameters: { type: "object", properties, required, additionalProperties: false },
    });
  };

  add("search_knowledge", "Look up an answer in the business's approved knowledge base.", {
    query: { type: "string", description: "The caller's question" },
  }, ["query"]);

  if (permissions?.booking) {
    add("check_availability", "Find genuinely free appointment times.", {
      date: { type: "string", description: "Date in YYYY-MM-DD, or empty for the next available day" },
    }, ["date"]);
    add("book_appointment", "Book an appointment in a free slot.", {
      start_time: { type: "string", description: "ISO start time of an offered slot" },
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      notes: { type: "string" },
    }, ["start_time", "name", "email", "phone", "notes"]);
  }

  add("request_callback", "Take the caller's details and ask a colleague to call them back.", {
    name: { type: "string" },
    phone: { type: "string" },
    reason: { type: "string" },
  }, ["name", "phone", "reason"]);

  if (permissions?.transfer) {
    add("transfer_call", "Put the caller through to a person.", {
      reason: { type: "string" },
    }, ["reason"]);
  }

  return tools;
}

server.listen(PORT, () => console.log(`[gateway] listening on ${PORT}`));
