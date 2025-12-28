import { NetworkMessage } from '../types';

// Define Peer interface locally since we use CDN
declare const Peer: any;

export class PeerService {
  private peer: any;
  private connections: Map<string, any> = new Map();
  private onMessageCallback: ((connId: string, data: NetworkMessage) => void) | null = null;
  private onDisconnectCallback: ((connId: string) => void) | null = null;
  private onOpenCallback: ((id: string) => void) | null = null;
  private onHostDisconnectCallback: (() => void) | null = null;
  public myId: string = '';

  constructor(customPeerId?: string) {
    // Use provided ID or generate a shorter, random ID for easier typing
    const peerId = customPeerId || Math.random().toString(36).substring(2, 6).toUpperCase();
    this.initializePeer(peerId, customPeerId);
  }

  private initializePeer(peerId: string, originalCustomId?: string) {
    this.peer = new Peer(peerId, {
      debug: 1,
    });

    this.peer.on('open', (id: string) => {
      console.log('My peer ID is: ' + id);
      this.myId = id;
      if (this.onOpenCallback) {
        this.onOpenCallback(id);
      }
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err: any) => {
      console.error('Peer error:', err);
      // If the ID is already taken, try with a new random suffix
      if (err.type === 'unavailable-id' && originalCustomId) {
        const newId = originalCustomId + Math.random().toString(36).substring(2, 4).toUpperCase();
        console.log('ID taken, retrying with:', newId);
        this.initializePeer(newId, undefined); // Don't retry again
      }
    });

    this.peer.on('disconnected', () => {
      console.log('Peer disconnected from server, attempting reconnect...');
      this.peer.reconnect();
    });
  }

  connect(peerId: string, metadata: any) {
    const conn = this.peer.connect(peerId, { metadata });
    this.setupConnection(conn, true);
  }

  private setupConnection(conn: any, isHostConnection: boolean = false) {
    conn.on('open', () => {
      console.log('Connected to: ' + conn.peer);
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data: NetworkMessage) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(conn.peer, data);
      }
    });

    conn.on('close', () => {
      console.log('Connection closed: ' + conn.peer);
      this.connections.delete(conn.peer);

      // Notify about disconnection
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(conn.peer);
      }

      // If this was the host connection, notify specifically
      if (isHostConnection && this.onHostDisconnectCallback) {
        this.onHostDisconnectCallback();
      }
    });

    conn.on('error', (err: any) => {
      console.error('Connection error with ' + conn.peer + ':', err);
    });
  }

  send(peerId: string, data: NetworkMessage) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  broadcast(data: NetworkMessage) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  }

  onMessage(callback: (connId: string, data: NetworkMessage) => void) {
    this.onMessageCallback = callback;
  }

  onDisconnect(callback: (connId: string) => void) {
    this.onDisconnectCallback = callback;
  }

  onOpen(callback: (id: string) => void) {
    this.onOpenCallback = callback;
    // If already open, call immediately
    if (this.myId) {
      callback(this.myId);
    }
  }

  onHostDisconnect(callback: () => void) {
    this.onHostDisconnectCallback = callback;
  }

  destroy() {
    this.peer.destroy();
  }
}
