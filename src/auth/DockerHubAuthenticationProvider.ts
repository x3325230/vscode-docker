/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { localize } from '../localize';

interface DockerHubToken {
    /* eslint-disable @typescript-eslint/naming-convention */
    session_id: string;
    username: string;
    user_id: string;
    /* eslint-enable @typescript-eslint/naming-convention */
    // Other properties exist but they are not used
}

export class DockerHubAuthenticationProvider implements vscode.AuthenticationProvider {
    private readonly sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private readonly sessions = new Map<string, vscode.AuthenticationSession>();

    public readonly onDidChangeSessions = this.sessionChangeEmitter.event;

    public async getSessions(scopes?: readonly string[]): Promise<readonly vscode.AuthenticationSession[]> {
        if (scopes?.length) {
            throw new Error(localize('vscode-docker.dockerHubAuthProvider.noScopesGet', 'Scopes are not supported by the DockerHubAuthenticationProvider.'));
        }

        return Array.from(this.sessions.values());
    }

    public async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
        if (scopes.length) {
            throw new Error(localize('vscode-docker.dockerHubAuthProvider.noScopesCreate', 'Scopes are not supported by the DockerHubAuthenticationProvider.'));
        }

        throw new Error('Method not implemented.');
    }

    public async removeSession(sessionId: string): Promise<void> {
        // Nothing needs to be done except remove the session from memory--there is no logout
        const session: vscode.AuthenticationSession | undefined = this.sessions.get(sessionId);
        if (session) {
            this.sessions.delete(sessionId);
            this.sessionChangeEmitter.fire(
                {
                    removed: [session]
                }
            );
        }
    }

    private async acquireToken(username: string, password: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    private async parseToken(token: string): Promise<DockerHubToken> {
        throw new Error('Method not implemented.');
    }
}
