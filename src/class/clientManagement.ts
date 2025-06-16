import { execFile, ChildProcess } from 'child_process';
import * as path from 'path';
import { unityPath, factoryPath, importJsonPath } from '../config';

class ClientManagement {
    private clients: Map<WebSocket, ChildProcess> = new Map();
    public isUnityPending = false;

    addClient(client: WebSocket) {
        if (this.isUnityPending) {
            return Promise.reject(new Error('Unity is pending'));
        }

        this.isUnityPending = true;

        return new Promise((resolve, reject) => {
            const child = execFile(path.join(unityPath, factoryPath), ['-importJson', path.join(unityPath, importJsonPath)], {
                cwd: unityPath
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }
                console.error(stderr);
                this.isUnityPending = false;
                resolve(true);
            });

            this.clients.set(client, child);
        });

    }

    removeClient(client: WebSocket) {
        const child = this.clients.get(client);
        if (child) {
            child.kill();
            this.clients.delete(client);
        }
    }
}

export default new ClientManagement();