import Offer from './offer';
import Answer from './answer';
import Candidate from './candidate';

const clients: Map<WebSocket, Set<string>> = new Map<WebSocket, Set<string>>();
const browserClients: Set<WebSocket> = new Set<WebSocket>();
const connectionPair: Map<string, [WebSocket, WebSocket]> = new Map<string, [WebSocket, WebSocket]>();

function getOrCreateConnectionIds(session: WebSocket): Set<string> {
  let connectionIds = null;

  if (!clients.has(session)) {
    connectionIds = new Set<string>();
    clients.set(session, connectionIds);
  }
  connectionIds = clients.get(session);
  return connectionIds;
}

function reset(mode: string): void {
  //
}

function add(ws: WebSocket): void {
  clients.set(ws, new Set<string>());
}

function remove(ws: WebSocket): void {
  const connectionIds = clients.get(ws);

  connectionIds.forEach(connectionId => {
    const pair = connectionPair.get(connectionId);
    if (pair) {
      const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
      if (otherSessionWs) {
        otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
      }
    }
    connectionPair.delete(connectionId);
  });

  clients.delete(ws);
}

/**
 * get unity clients
 * @returns 
 */
function getUnityClients(): Set<WebSocket> {
  return new Set(Array.from(clients.keys()).filter(ws => !browserClients.has(ws)));
}

function getNotPairUnityClients(): Set<WebSocket> {
  const pairClients = new Set<WebSocket>();

  connectionPair.forEach((pair) => {
    if (pair[0]&&pair[1]){
      pairClients.add(pair[0]);
      pairClients.add(pair[1]);
    }    
  });

  const unityClients = getUnityClients();
  const notPairUnityClients = new Set<WebSocket>();

  unityClients.forEach(client => {
    if (!pairClients.has(client)) {
      notPairUnityClients.add(client);
    }
  });

  return notPairUnityClients;
}

/**
 * handle connect, just for browser
 * @param ws 
 * @param connectionId 
 * @returns 
 */
function onConnect(ws: WebSocket, connectionId: string): void {
  let polite = true;
  browserClients.add(ws);

  if (connectionPair.has(connectionId)) {
    const pair = connectionPair.get(connectionId);

    if (pair[0] != null && pair[1] != null) {
      ws.send(JSON.stringify({ type: "error", message: `${connectionId}: This connection id is already used.` }));
      return;
    }
    else if (pair[0] != null) {
      connectionPair.set(connectionId, [pair[0], ws]);
    }
  } else {
    connectionPair.set(connectionId, [ws, null]);
    polite = false;
  }

  const connectionIds = getOrCreateConnectionIds(ws);
  connectionIds.add(connectionId);

  ws.send(JSON.stringify({ type: "connect", connectionId: connectionId, polite: polite }));
}

/**
 * handle offer event
 * @param ws 
 * @param message 
 * @returns 
 */
function onOffer(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId as string;
  const newOffer = new Offer(message.sdp, Date.now(), false);

  if (connectionPair.has(connectionId)) {
    const pair = connectionPair.get(connectionId);
    const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];

    newOffer.polite = true;

    if (otherSessionWs) {
      otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
    } else {
      const clientsArray = Array.from(getNotPairUnityClients().values());
      clientsArray.forEach(client => {
        client.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
      });
    }
  }
}

/**
 * handle disconnect 
 * @param ws
 * @param connectionId 
 */
function onDisconnect(ws: WebSocket, connectionId: string): void {
  const connectionIds = clients.get(ws);
  connectionIds.delete(connectionId);

  if (connectionPair.has(connectionId)) {
    const pair = connectionPair.get(connectionId);
    const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
    if (otherSessionWs) {
      otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
    }
  }
  connectionPair.delete(connectionId);
  ws.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
}

/**
 * handle answer, only for unity
 * @param ws 
 * @param message 
 * @returns 
 */
function onAnswer(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId as string;
  const connectionIds = getOrCreateConnectionIds(ws);
  const newAnswer = new Answer(message.sdp, Date.now());

  connectionIds.add(connectionId);

  if (!connectionPair.has(connectionId)) {
    return;
  }

  const pair = connectionPair.get(connectionId);
  const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];

  connectionPair.set(connectionId, [otherSessionWs, ws]);
  otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "answer", data: newAnswer }));
}

/**
 * handle candidate
 * @param ws 
 * @param message 
 */
function onCandidate(ws: WebSocket, message: any): void {
  const connectionId = message.connectionId;
  const candidate = new Candidate(message.candidate, message.sdpMLineIndex, message.sdpMid, Date.now());
  const info = JSON.stringify({ from: connectionId, to: "", type: "candidate", data: candidate });


  if (connectionPair.has(connectionId)) {
    const pair = connectionPair.get(connectionId);
    const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];

    if (otherSessionWs) {
      otherSessionWs.send(info);
    } else {
      const clientsArray = Array.from(getNotPairUnityClients().values());
      clientsArray.forEach(client => {
        client.send(info);
      });
    }
  }
}

export { reset, add, remove, onConnect, onDisconnect, onOffer, onAnswer, onCandidate };
