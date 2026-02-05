import { JSDOM } from "jsdom";

const STATUS_URL = "https://codeforces.com/problemset/status";

type VerdictSnapshot = {
    verdict: string;
    time: string;
    memory: string;
};

type MonitorItem = {
    recordId: number;
    last?: VerdictSnapshot;
};

type NowSubmission = VerdictSnapshot & { submissionId: number };

type CodeforcesUpdate = {
    time: number;
    id: number;
    contestID: number;
    problemID: number;
    testSet: string;
    points: number;
    verdict: string;
    passedCount: number;
    judgedCount: number;
    timeConsumed: number;
    memoryConsumed: number;
    participantID: number;
    lang: number;
    diagnostics: number;
};

const monitorMap: Map<number, MonitorItem> = new Map();
const nowSubmissionMap: Map<number, NowSubmission> = new Map();
let polling = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let websocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let cachedWsLink: string | null = null;

const normalizeText = (value: string | null | undefined) =>
    (value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const formatTime = (value?: number) =>
    value && Number.isFinite(value) ? `${value} ms` : "";

const formatMemory = (value?: number) => {
    if (!value || !Number.isFinite(value)) return "";
    const kb = Math.round(value / 1024);
    return `${kb} KB`;
};

const fetch_status_html = async (): Promise<string> => {
    const attempt = async (retry: boolean): Promise<string> => {
        try {
            const res = await fetch(STATUS_URL, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (err) {
            LOG.warn(`CF track fetch failed: ${err}`);
            if (!retry) return attempt(true);
            return "";
        }
    };

    return attempt(false);
};

const parse_status_page = (html: string): {
    submissions: NowSubmission[];
    monitorSnapshot: Map<number, VerdictSnapshot>;
} => {
    const submissions: NowSubmission[] = [];
    const monitorSnapshot = new Map<number, VerdictSnapshot>();
    if (!html) return { submissions, monitorSnapshot };

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const rows = doc.querySelectorAll("tr[data-submission-id]");

    rows.forEach((row) => {
        const idStr = row.getAttribute("data-submission-id") || "";
        const submissionId = Number(idStr);
        if (!Number.isFinite(submissionId)) return;

        const verdict = normalizeText(
            row.querySelector(".submissionVerdictWrapper")?.textContent,
        );
        const time = normalizeText(row.querySelector(".time-consumed-cell")?.textContent);
        const memory = normalizeText(
            row.querySelector(".memory-consumed-cell")?.textContent,
        );

        const submission: NowSubmission = { submissionId, verdict, time, memory };
        submissions.push(submission);
        if (monitorMap.has(submissionId)) {
            monitorSnapshot.set(submissionId, { verdict, time, memory });
        }
    });

    return { submissions, monitorSnapshot };
};

const codeforces_prop_parse = (arg: Array<string | number>): CodeforcesUpdate => ({
    time: arg[0] as number,
    id: arg[1] as number,
    contestID: arg[2] as number,
    problemID: arg[3] as number,
    testSet: arg[4] as string,
    points: arg[5] as number,
    verdict: arg[6] as string,
    passedCount: arg[7] as number,
    judgedCount: arg[8] as number,
    timeConsumed: arg[9] as number,
    memoryConsumed: arg[10] as number,
    participantID: arg[11] as number,
    lang: arg[16] as number,
    diagnostics: arg[17] as number,
});

const snapshot_from_update = (update: CodeforcesUpdate): VerdictSnapshot => ({
    verdict: update.verdict || "",
    time: formatTime(update.timeConsumed),
    memory: formatMemory(update.memoryConsumed),
});

const notify_update = (
    submissionId: number,
    recordId: number,
    snapshot: VerdictSnapshot,
    previous?: VerdictSnapshot,
) => {
    const changed = !previous ||
        previous.verdict !== snapshot.verdict ||
        previous.time !== snapshot.time ||
        previous.memory !== snapshot.memory;

    if (!changed) return;

    LOG.info(
        `CF track update submission=${submissionId} record=${recordId} verdict=${snapshot.verdict} time=${snapshot.time} memory=${snapshot.memory}`,
    );

    // Best-effort notify if a socket is globally available (edge runtime).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socket = global.socket;
    if (socket && typeof socket.emit === "function") {
        try {
            let on = -1;
            let status = "";
            if (snapshot.verdict.includes("Running on test")) {
                status = "JUDGING";
                on = parseInt(
                    snapshot.verdict.replace("Running on test ", ""),
                ) || 0;
            }
            socket.emit("track_update", {
                record_id: recordId,
                submission_id: submissionId,
                status,
                on_test: on,
                time: snapshot.time,
                memory: snapshot.memory,
            });
        } catch (err) {
            LOG.warn(`CF track emit failed: ${err}`);
        }
    } else {
        LOG.warn("CF track socket not available for emit.");
    }
};

const update_monitor_snapshot = (submissionId: number, snapshot: VerdictSnapshot) => {
    const item = monitorMap.get(submissionId);
    if (!item) return;
    notify_update(submissionId, item.recordId, snapshot, item.last);
    item.last = snapshot;
    monitorMap.set(submissionId, item);
};

const get_ws_link = async (refresh = false): Promise<string | null> => {
    if (!refresh && cachedWsLink) return cachedWsLink;
    const html = await fetch_status_html();
    if (!html) return null;

    const dom = new JSDOM(html);
    const token = dom.window.document.querySelector("meta[name='gc']")?.getAttribute("content");
    if (!token) return null;

    cachedWsLink = `wss://pubsub.codeforces.com/ws/s_${token}`;
    return cachedWsLink;
};

const handle_ws_message = (event: { data: unknown }) => {
    try {
        const rawPayload = event.data as
            | string
            | { toString?: () => string }
            | undefined
            | null;
        const raw = typeof rawPayload === "string"
            ? rawPayload
            : rawPayload && typeof rawPayload.toString === "function"
                ? rawPayload.toString()
                : "";
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const payload = JSON.parse(parsed.text || "{}");
        const data = payload?.d;
        if (!Array.isArray(data)) return;

        const update = codeforces_prop_parse(data as Array<string | number>);
        const snapshot = snapshot_from_update(update);
        nowSubmissionMap.set(update.id, {
            submissionId: update.id,
            verdict: snapshot.verdict,
            time: snapshot.time,
            memory: snapshot.memory,
        });
        update_monitor_snapshot(update.id, snapshot);
    } catch (err) {
        LOG.warn(`CF ws message parse failed: ${err}`);
    }
};

const connect_ws = async () => {
    try {
        const link = await get_ws_link(true);
        if (!link) {
            LOG.warn("CF ws link unavailable, retrying in 5s");
            if (!reconnectTimer) reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connect_ws();
            }, 5000);
            return;
        }

        if (websocket) {
            try {
                websocket.close();
            } catch (_) {
                // ignore
            }
        }

        websocket = new WebSocket(link);
        LOG.log("Codeforces tracking socket connecting...");

        websocket.addEventListener("open", () => {
            LOG.log("Codeforces tracking socket connected");
        });

        websocket.addEventListener("message", handle_ws_message);

        websocket.addEventListener("close", (event) => {
            LOG.log(
                `Codeforces tracking socket closed: ${event.reason || "no reason"}, reconnecting in 5s...`,
            );
            if (!reconnectTimer) reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connect_ws();
            }, 5000);
        });

        websocket.addEventListener("error", (err) => {
            LOG.warn(`Codeforces tracking socket error: ${err}`);
        });
    } catch (err) {
        LOG.warn(`CF websocket track failed: ${err}`);
        if (!reconnectTimer) reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect_ws();
        }, 5000);
    }
};

export const add_monitor = (record_id: number, submission_id: number) => {
    monitorMap.set(submission_id, { recordId: record_id });
    if (!polling) {
        poll_service();
    }
};

export const poll_service = () => {
    if (polling) return;
    polling = true;
    const run_once = async () => {
        const html = await fetch_status_html();
        if (!html) return;
        const { submissions, monitorSnapshot } = parse_status_page(html);
        nowSubmissionMap.clear();
        submissions.slice(0, 1000).forEach((s) => {
            nowSubmissionMap.set(s.submissionId, s);
        });
        monitorSnapshot.forEach((value, submissionId) => {
            update_monitor_snapshot(submissionId, value);
        });
    };

    run_once();
    pollTimer = setInterval(run_once, 1000);
};

export const track_start = () => {
    connect_ws();
    poll_service();
};