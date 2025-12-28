'use client'

import { CodeEditor } from "@/components/codeEditor";
import { Notification } from "@/components/notification";
import { UserList } from "@/components/userList";
import { ClientMessage, ServerMessage, SessionUser } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionCode = params.code as string;

    const [code, setCode] = useState('// Start coding together!');
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
    const [users, setUsers] = useState<SessionUser[]>([]);
    const [notification, setNofication] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!sessionCode) return;

        const ws = new WebSocket("ws://localhost:8080");
        wsRef.current = ws;

        ws.onopen = () => {
            const joinMessage: ClientMessage = {
                type: 'JOIN',
                sessionId: sessionCode,
            };

            ws.send(JSON.stringify(joinMessage));
        };

        ws.onmessage = (event) => {
            let message: ServerMessage;
            try {
                message = JSON.parse(event.data) as ServerMessage;
            } catch {
                console.error("Invalid JSON from server");
                return;
            }

            switch (message.type) {
                case "INIT": {
                    setCurrentUser({
                        username: message.username,
                        role: message.role,
                    });
                    setCode(message.code);
                    break;
                }
                case "UPDATE": {
                    setCode(message.code);
                    break;
                }
                case "NOTIFICATION": {
                    setNofication(message.message);
                    break;
                }
                case "USER_LIST": {
                    setUsers(message.users);
                    break;
                }
                default: {
                }
            }
        };

        ws.onerror = (error) => {
            console.warn("WebSocket error event (browser gives no details)");
        };

        ws.onclose = (event) => {
            console.log("WS closed", event.code, event.reason);

            if (currentUser) {
                setNofication("Disconnected from session");
            }
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [sessionCode]);

    // for auto-clearing notification
    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(() => setNofication(null), 2500);
        return () => clearTimeout(t);
    }, [notification]);

    const handleCodeChange = (newCode: string) => {
        if (currentUser?.role !== "editor") return;

        setCode(newCode);

        const updateMessage: ClientMessage = {
            type: 'UPDATE',
            code: newCode,
        }

        wsRef.current?.send(JSON.stringify(updateMessage));
    }

    const copyToClipboard = (message: string) => {
        navigator.clipboard.writeText(message);
        setNofication('Code copied to clipboard!');
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <p className="text-neutral-400">Joining session...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4">
            <Notification message={notification} />

            <header className="flex justify-between items-center mb-6">
                <div className="flex gap-3 items-center justify-between">
                    <h1 className="text-xl font-bold">Session: {sessionCode}</h1>
                    <button
                        onClick={() => copyToClipboard(sessionCode)}
                        className="text-sm bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded"
                    >
                        Copy Session Code
                    </button>
                </div>
                <div className="flex gap-2">
                    <span className="text-sm bg-emerald-900 px-2 py-1 rounded">
                        You: {currentUser.username} ({currentUser.role})
                    </span>
                    <button
                        onClick={() => router.push('/')}
                        className="text-sm text-neutral-400 hover:text-white"
                    >
                        Leave
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                        <div className="flex justify-between items-center p-3 bg-neutral-800">
                            <span className="text-sm text-neutral-400">Code</span>
                            <button
                                onClick={() => copyToClipboard(code)}
                                className="text-sm bg-neutral-700 hover:bg-neutral-600 px-2 py-1 rounded"
                            >
                                Copy Code
                            </button>
                        </div>

                        <CodeEditor
                            value={code}
                            onChange={handleCodeChange}
                            readOnly={currentUser.role === 'viewer'}
                        />
                    </div>
                </div>

                <div>
                    <UserList users={users} />
                </div>
            </div>
        </div>
    )
}