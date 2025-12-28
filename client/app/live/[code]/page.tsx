'use client'

import { CodeEditor } from "@/components/codeEditor";
import { Notification } from "@/components/notification";
import { SessionUser } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import UserList from "@/components/userLIst";

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
        // 1. Establish Connection
        const ws = new WebSocket('ws://localhost:8080');
        wsRef.current = ws;

        ws.onopen = () => {
            // Joying the session immediately after connecting
            ws.send(JSON.stringify({ type: 'JOIN', sessionId: sessionCode }));
        };

        // 2. Listen for Messages
        ws.onmessage = (event) => {
            // 3. Parse data
            const message = JSON.parse(event.data);

            // 4. Filter by type and update state
            switch (message.type) {
                case 'INIT':
                    setCurrentUser({
                        id: 'temp-id', // Usually server sends the real ID
                        username: message.username,
                        role: message.role
                    });
                    setCode(message.code);
                    break;

                case 'UPDATE':
                    setCode(message.code);
                    break;

                case 'USER_LIST':
                    // Updating your beautiful UserList component!
                    setUsers(message.users);
                    break;

                case 'NOTIFICATION':
                    setNofication(message.message);
                    break;
            }
        };

        // Cleanup: close connection when user leaves the page
        return () => {
            ws.close();
        };
    }, [sessionCode]);

    const handleCodeChange = (newCode: string) => {
        if (currentUser?.role === 'editor') {
            setCode(newCode);
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
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
                <h1 className="text-xl font-bold">Session: {sessionCode}</h1>
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
                                onClick={copyToClipboard}
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